import os

# API Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"

# Database Configuration
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://beyondmeet:beyondmeet@db:5432/beyondmeet"
)

# Redis Configuration
REDIS_HOST = "redis"
REDIS_PORT = 6379
REDIS_DB = 0

# Email Configuration
QUERY_DAYS = 365
IGNORED_EMAILS = []
IGNORED_DOMAINS = ["@google.com", "@resource.calander.google.com"]
EMAIL_REGEX = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

# OAuth Configuration
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
TOKEN_PATH = "token.pickle"
CREDENTIALS_PATH = "credentials.json"

# Rate Limiting
RATE_LIMIT = 100  # requests per minute
RATE_WINDOW = 60  # seconds
