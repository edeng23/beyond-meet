import asyncio
import logging
from email import message_from_bytes
import base64
import re
from typing import Set
from icalendar import Calendar

from app.config import EMAIL_REGEX, IGNORED_DOMAINS, IGNORED_EMAILS, QUERY_DAYS
from app.services.gmail_service import GmailService
from app.services.graph_service import GraphService


class EmailProcessor:
    def __init__(
        self, gmail_service: GmailService, graph_service: GraphService, progress_queue
    ):
        self.gmail_service = gmail_service
        self.graph_service = graph_service
        self.progress_queue = progress_queue
        self.total_steps = 0
        self.current_step = 0
        self.user_email = None

    async def update_progress(self, increment=1):
        """Update progress and send through SSE"""
        self.current_step += increment
        progress = min(int((self.current_step / self.total_steps) * 100), 100)
        await self.progress_queue.put({"progress": progress})
        await asyncio.sleep(0.1)

    async def process_emails(self, processed_emails: Set[str]):
        """Process emails from the Gmail API"""
        try:
            logging.info("Starting email processing...")
            # First, get the user's email address
            profile = (
                self.gmail_service.service.users()
                .getProfile(userId="me")
                .execute()  # type: ignore[attr-defined]
            )
            self.user_email = profile["emailAddress"].lower()
            logging.info(f"Processing emails for user: {self.user_email}")

            query = f"has:attachment filename:ics newer_than:{QUERY_DAYS}d"
            logging.info(f"Using query: {query}")
            messages = self.gmail_service.get_messages(query)
            logging.info(f"Found {len(messages)} messages to process")

            self.total_steps = len(messages) * 2
            await self.update_progress(0)

            for i, message in enumerate(messages):
                try:
                    await self.process_message(message, processed_emails)
                    await self.update_progress(2)
                    if i % 10 == 0:
                        logging.info(f"Processed {i}/{len(messages)} messages")
                        logging.info(
                            f"Current graph has {len(self.graph_service.nodes)} nodes"
                        )
                except Exception as e:
                    logging.error(f"Error processing message: {e}")
                    continue

            logging.info("Email processing complete")
            logging.info(
                f"Final graph has {len(self.graph_service.nodes)} nodes and {len(self.graph_service.links)} links"
            )
            await self.update_progress(100)
        except Exception as e:
            logging.error(f"Error in process_emails: {e}", exc_info=True)
            raise

    def extract_email_addresses(self, mime_msg) -> Set[str]:
        """Extract email addresses from a MIME message"""
        participants = set()
        for part in mime_msg.walk():
            try:
                if part.get("Content-Type", "").startswith("multipart"):
                    continue
                payload = part.get_payload(decode=True)
                if payload:
                    payload = (
                        payload.decode("utf-8").replace("\r\n", " ").replace("\n", " ")
                    )
                    found_emails = re.findall(EMAIL_REGEX, str(payload))
                    for email in found_emails:
                        cleaned_email = email.lower()
                        if (
                            cleaned_email != self.user_email
                            and cleaned_email not in IGNORED_EMAILS
                            and not any(
                                domain in cleaned_email for domain in IGNORED_DOMAINS
                            )
                        ):
                            participants.add(cleaned_email)
            except Exception as e:
                logging.error(f"Error extracting email addresses: {e}")
        return participants

    async def process_message(self, message: dict, processed_emails: Set[str]):
        """Process a single email message"""
        try:
            msg_id = message["id"]
            if msg_id in processed_emails:
                return

            msg_data = self.gmail_service.get_message(msg_id)
            if not msg_data:
                return

            raw = base64.urlsafe_b64decode(msg_data["raw"])
            mime_msg = message_from_bytes(raw)

            # Extract meetings from calendar attachments
            meetings = []
            for part in mime_msg.walk():
                if part.get_content_type() == "text/calendar":
                    cal_data = part.get_payload(decode=True)
                    cal = Calendar.from_ical(cal_data)
                    for component in cal.walk():
                        if component.name == "VEVENT":
                            meeting = {
                                "date": component.get("dtstart").dt.isoformat(),
                                "title": str(component.get("summary", "No Title")),
                                "location": str(
                                    component.get("location", "No Location")
                                ),
                            }
                            meetings.append(meeting)

            # Extract participants
            participants = self.extract_email_addresses(mime_msg)

            # Update graph with participants and meetings
            for email in participants:
                if email not in self.graph_service.nodes:
                    self.graph_service.nodes[email] = {
                        "id": email,
                        "email": email,
                        "name": email.split("@")[0],
                        "company": email.split("@")[1],
                        "companyDomain": email.split("@")[1],
                        "firstName": "",
                        "lastName": "",
                        "linkedinUrl": "",
                        "notes": "",
                        "meetings": meetings,
                    }
                else:
                    # Append new meetings to existing node
                    existing_meetings = set(
                        (m["date"], m["title"], m["location"])
                        for m in self.graph_service.nodes[email].get("meetings", [])
                    )
                    for meeting in meetings:
                        meeting_tuple = (
                            meeting["date"],
                            meeting["title"],
                            meeting["location"],
                        )
                        if meeting_tuple not in existing_meetings:
                            self.graph_service.nodes[email]["meetings"].append(meeting)

                # Add connections between participants
                for other_email in participants:
                    if email != other_email:
                        self.graph_service.links.add((email, other_email))

            processed_emails.add(msg_id)
        except Exception as e:
            logging.error(f"Error processing message {message.get('id')}: {e}")
