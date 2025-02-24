from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build, Resource
import logging
from typing import Any, Dict, List


class GmailService:
    def __init__(self, credentials: Credentials):
        self.credentials = credentials
        self.service = build("gmail", "v1", credentials=credentials)  # type: ignore[no-untyped-call]

    def get_messages(self, query: str) -> List[Dict[str, Any]]:
        """Get messages from Gmail API"""
        try:
            all_messages = []
            next_page_token = None

            while True:
                results = (
                    self.service.users()
                    .messages()
                    .list(
                        userId="me",
                        q=query,
                        maxResults=500,  # Get more messages per request
                        pageToken=next_page_token,
                    )
                    .execute()  # type: ignore[attr-defined]
                )
                messages = results.get("messages", [])
                if messages:
                    all_messages.extend(messages)

                # Get next page token
                next_page_token = results.get("nextPageToken")
                if not next_page_token:
                    break

            logging.info(f"Found total of {len(all_messages)} messages")
            return all_messages
        except Exception as e:
            logging.error(f"Error getting messages: {e}")
            return []

    def get_message(self, msg_id: str) -> Dict[str, Any]:
        """Get a specific message by ID"""
        try:
            return (
                self.service.users()  # type: ignore[attr-defined]
                .messages()
                .get(userId="me", id=msg_id, format="raw")
                .execute()
            )
        except Exception as e:
            logging.error(f"Error fetching message {msg_id}: {e}")
            return None
