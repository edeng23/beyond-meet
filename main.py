import base64
import os
import pickle
import re
from email import message_from_bytes
import logging

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from icalendar import Calendar
from neo4j import GraphDatabase

# Setup basic logging
logging.basicConfig(level=logging.INFO)

# Constants
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
IGNORED_EMAILS = []
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "Aa123456")
TOKEN_PATH = "token.pickle"
CREDENTIALS_PATH = "credentials.json"
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


class GmailService:
    """
    Gmail API service wrapper
    """

    def __init__(self):
        self.service = self.authenticate_gmail()

    def authenticate_gmail(self):
        """
        Authenticate the Gmail API service
        """
        creds = None
        if os.path.exists(TOKEN_PATH):
            with open(TOKEN_PATH, "rb") as token:
                creds = pickle.load(token)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_PATH, SCOPES
                )
                creds = flow.run_local_server(port=0)
            with open(TOKEN_PATH, "wb") as token:
                pickle.dump(creds, token)
        return build("gmail", "v1", credentials=creds)

    def get_messages(self, query, max_results=500):
        """
        Get messages from the Gmail API
        """
        results = (
            self.service.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )
        return results.get("messages", [])

    def get_message(self, msg_id):
        """
        Get a specific message from the Gmail API
        """
        msg = (
            self.service.users()
            .messages()
            .get(userId="me", id=msg_id, format="raw")
            .execute()
        )
        msg_bytes = base64.urlsafe_b64decode(msg["raw"])
        return message_from_bytes(msg_bytes)


class Neo4jService:
    """
    Neo4j service wrapper
    """

    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        """
        Close the Neo4j driver
        """
        self.driver.close()

    def create_or_update_person(self, email):
        """
        Create or update a person node in the graph
        """
        with self.driver.session() as session:
            session.write_transaction(self._merge_person, email.lower())

    def create_email_connection(self, person_email, other_email):
        """
        Create a connection between two person nodes in the graph
        """
        with self.driver.session() as session:
            session.write_transaction(
                self._merge_email_connection, person_email.lower(), other_email.lower()
            )

    @staticmethod
    def _merge_person(tx, email):
        """
        Run a MERGE query to create or update a person node
        """
        query = """
            MERGE (p:Person {email: $email})
            ON CREATE SET p.name = $email
            ON MATCH SET p.name = $email
        """
        tx.run(query, email=email)

    @staticmethod
    def _merge_email_connection(tx, person_email, other_email):
        """
        Merge a connection between two person nodes
        """
        query = """
            MERGE (p1:Person {email: $person_email})
            MERGE (p2:Person {email: $other_email})
            WITH p1, p2 WHERE p1 <> p2
            MERGE (p1)-[:CONNECTED]->(p2)
        """
        tx.run(query, person_email=person_email, other_email=other_email)


class EmailProcessor:
    """
    Email processing service
    """

    def __init__(self, gmail_service, neo4j_service):
        self.gmail_service = gmail_service
        self.neo4j_service = neo4j_service

    def process_emails(self, processed_emails):
        """
        Process emails from the Gmail API
        """
        messages = self.gmail_service.get_messages("has:attachment")
        for message in messages:
            self.process_message(message, processed_emails)

    def process_message(self, message, processed_emails):
        """
        Process a specific message
        """
        mime_msg = self.gmail_service.get_message(message["id"])
        for part in mime_msg.walk():
            if part.get_content_type() == "text/calendar":
                invitees = self.parse_ical_content(part.get_payload(decode=True))
                for invitee in invitees:
                    if invitee not in processed_emails:
                        processed_emails.add(invitee)
                        self.process_invitee(invitee)

    def process_invitee(self, invitee):
        """
        Process a specific invitee
        """
        if invitee in IGNORED_EMAILS:
            return
        logging.info(f"Processing {invitee}")
        emails = self.gmail_service.get_messages(
            f"from:{invitee} OR to:{invitee} OR cc:{invitee} OR bcc:{invitee}"
        )
        for email in emails:
            self.process_email(email["id"], invitee)

    def process_email(self, email_id, invitee):
        """
        Process a specific email
        """
        email_data = self.gmail_service.get_message(email_id)
        participants = self.extract_email_addresses(email_data)
        self.neo4j_service.create_or_update_person(invitee.lower())
        for participant in participants:
            logging.info(f"Processing participant {participant}")
            self.neo4j_service.create_or_update_person(participant.lower())
            self.neo4j_service.create_email_connection(
                invitee.lower(), participant.lower()
            )

    @staticmethod
    def parse_ical_content(content):
        """
        Parse iCal content and extract invitees
        """
        invitees = set()
        calendar = Calendar.from_ical(content)
        for component in calendar.walk():
            if component.name == "VEVENT":
                attendee_list = component.get("attendee", [])
                if not isinstance(attendee_list, list):
                    attendee_list = [attendee_list]
                for attendee in attendee_list:
                    email = str(attendee).split("mailto:")[-1].lower()
                    if email not in IGNORED_EMAILS:
                        invitees.add(email)
        return invitees

    @staticmethod
    def extract_email_addresses(mime_msg):
        """
        Extract email addresses from a MIME message
        """
        participants = set()
        for part in mime_msg.walk():
            try:
                if part.get("Content-Type", "").startswith("multipart"):
                    continue
                payload = part.get_payload(decode=True)
                if payload:
                    found_emails = EMAIL_REGEX.findall(str(payload))
                    for email in found_emails:
                        cleaned_email = email.lower()
                        if cleaned_email not in IGNORED_EMAILS:
                            participants.add(cleaned_email)
            except Exception as e:
                logging.error(f"Error extracting email addresses: {e}")
        return participants


if __name__ == "__main__":
    processed_emails = set()
    gmail_service = GmailService()
    neo4j_service = Neo4jService()

    try:
        email_processor = EmailProcessor(gmail_service, neo4j_service)
        email_processor.process_emails(processed_emails)
    except Exception as e:
        logging.error(f"Error processing emails: {e}")
    finally:
        logging.info("Closing Neo4j driver")
        neo4j_service.close()
