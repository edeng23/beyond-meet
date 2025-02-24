import pickle
from google.oauth2.credentials import Credentials
from redis.asyncio import Redis
import logging


class UserSession:
    def __init__(self, user_id: str, credentials: Credentials):
        self.user_id = user_id
        self.credentials = credentials
        self.gmail_service = None


class SessionManager:
    def __init__(self):
        self.redis = Redis(host="redis", port=6379, db=0, decode_responses=False)
        self.ttl = 24 * 60 * 60  # 24 hours
        self.sessions = {}  # In-memory cache

    async def store_session(self, user_id: str, session: UserSession):
        """Store session in both memory and Redis"""
        try:
            # Store in memory
            self.sessions[user_id] = session

            # Store in Redis
            session_data = pickle.dumps(session)
            await self.redis.set(f"session:{user_id}", session_data, ex=self.ttl)
        except Exception as e:
            logging.error(f"Error storing session: {e}")

    async def get_session(self, user_id: str) -> UserSession | None:
        """Get session from memory or Redis"""
        try:
            # Try memory first
            if user_id in self.sessions:
                return self.sessions[user_id]

            # Try Redis
            session_data = await self.redis.get(f"session:{user_id}")
            if session_data:
                session = pickle.loads(session_data)
                self.sessions[user_id] = session  # Cache in memory
                return session

            return None
        except Exception as e:
            logging.error(f"Error retrieving session: {e}")
            return None

    async def remove_session(self, user_id: str):
        """Remove session from both memory and Redis"""
        try:
            if user_id in self.sessions:
                del self.sessions[user_id]
            await self.redis.delete(f"session:{user_id}")
        except Exception as e:
            logging.error(f"Error removing session: {e}")
