import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
from sqlalchemy.exc import OperationalError
from fastapi.responses import JSONResponse
from collections import defaultdict

from app.api import auth, graph
from app.database import metadata, engine
from app.services.session_manager import SessionManager

# Setup basic logging
# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],  # This ensures logs go to stdout
)

# Ensure all loggers show INFO level
logging.getLogger().setLevel(logging.INFO)
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("fastapi").setLevel(logging.INFO)

# Create FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
        "https://accounts.google.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Add retry mechanism for database connection
def wait_for_db(retries=5, delay=2):
    """Wait for database to be ready"""
    for i in range(retries):
        try:
            # Try to connect to the database
            with engine.connect() as conn:
                return True
        except OperationalError as e:
            if i == retries - 1:
                raise e
            logging.warning(f"Database not ready, retrying in {delay} seconds...")
            time.sleep(delay)
    return False


# Wait for database before creating tables
wait_for_db()

# Create database tables
metadata.create_all(engine)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(graph.router, prefix="/api", tags=["graph"])


# Add startup event to initialize asyncio policies
@app.on_event("startup")
async def startup_event():
    # Set a larger limit for asyncio tasks
    loop = asyncio.get_event_loop()
    loop.set_default_executor(ThreadPoolExecutor(max_workers=20))


# Initialize session manager
session_manager = SessionManager()
