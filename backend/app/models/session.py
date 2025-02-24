from google.oauth2.credentials import Credentials


class UserSession:
    def __init__(self, user_id: str, credentials: Credentials):
        self.user_id = user_id
        self.credentials = credentials
        self.gmail_service = None
