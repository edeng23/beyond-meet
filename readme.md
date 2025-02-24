# Beyond Meet

A tool that visualizes your professional network by analyzing your calendar meetings and email interactions.

## Features

- Interactive network visualization with real-time progress tracking
- Search and filter connections
- View meeting history with connections
- Edit and store contact information
- Secure Google OAuth2 authentication
- Persistent graph storage between sessions

## Tech Stack

### Backend
- FastAPI
- PostgreSQL
- Redis
- Google Gmail API
- Server-Sent Events (SSE) for real-time progress updates

### Frontend
- Next.js 13
- React
- TypeScript
- Tailwind CSS
- Force Graph for network visualization
- EventSource API for real-time updates

## Setup

### Prerequisites
- Docker and Docker Compose (recommended for easy setup)
- Python 3.11+ (if running without Docker)
- Node.js 18+ (if running without Docker)
- PostgreSQL
- Redis
- Google Cloud Platform account with Gmail API enabled

### Google API Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Gmail API
3. Configure the OAuth consent screen
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URIs:
   - `http://localhost:8000/api/auth_callback`
   - `http://localhost:3000`

### Environment Variables

1. Create a root `.env` file:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

2. Create a frontend `.env.local` file:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running with Docker (Recommended)

The easiest way to run the application is using Docker Compose:

```bash
# Build and start all services
make dev

# Or step by step:
make build
make run
```

This will start:
- PostgreSQL database
- Redis cache
- FastAPI backend on http://localhost:8000
- Next.js frontend on http://localhost:3000

### Manual Installation

1. Clone the repository

2. Backend setup:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Frontend setup:
```bash
cd frontend
npm install --legacy-peer-deps
```

### Running Manually

1. Start PostgreSQL and Redis

2. Start the backend:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. Start the frontend:
```bash
cd frontend
npm run dev
```

4. Visit http://localhost:3000 in your browser

## Usage

1. Sign in with your Google account
2. The application will automatically generate your network graph on first login
3. You'll see a progress bar indicating the graph generation status
4. Once complete, you can:
   - Search for contacts
   - Click on nodes to view contact details
   - Edit contact information
   - Regenerate the graph as needed

## Troubleshooting

- **Progress bar stuck**: If the progress bar gets stuck, try refreshing the page. The application will reconnect to the progress stream.
- **Authentication errors**: Ensure your Google API credentials are correctly set up and the redirect URIs match your environment.
- **Empty graph**: If your graph is empty, you may not have enough email interactions in your Gmail account, or the permissions might be insufficient.

## Useful Commands

```bash
# View backend logs
make backend-logs

# View frontend logs
make frontend-logs

# Access database shell
make db-shell

# Restart all services
make restart

# Clean up all containers and volumes
make clean
```

## License

This project is licensed under the MIT License - see the LICENSE file for details