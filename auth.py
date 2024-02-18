from google_auth_oauthlib.flow import InstalledAppFlow
import pickle

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
credentials_path = "credentials.json"  # Path to your 'credentials.json' file
token_path = "token.pickle"

flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
creds = flow.run_local_server(port=8844)

with open(token_path, "wb") as token:
    pickle.dump(creds, token)
