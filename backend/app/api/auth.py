import logging
import json
import os
from fastapi import APIRouter, HTTPException
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel, ValidationError
from fastapi.responses import JSONResponse

from app.config import (
    GOOGLE_CLIENT_ID,
    CREDENTIALS_PATH,
)
from app.models.session import UserSession
from app.services.session_manager import SessionManager

router = APIRouter()
session_manager = SessionManager()

# Add debug logging at module level
logging.info(f"GOOGLE_CLIENT_ID from config: {GOOGLE_CLIENT_ID}")


class CodeRequest(BaseModel):
    code: str
    redirect_uri: str | None = None  # Make redirect_uri optional with default None

    # Add example for documentation
    class Config:
        json_schema_extra = {
            "example": {
                "code": "4/1234...",
                "redirect_uri": "http://localhost:3000",
            }
        }


@router.post("/auth_code")
async def authenticate_code(request: CodeRequest):
    """Exchange OAuth code for credentials"""
    try:
        # Log the incoming request data
        logging.info("Received auth request")
        logging.info(f"Request data: {request.model_dump_json()}")  # Log full request
        logging.info(f"Code length: {len(request.code) if request.code else 0}")
        logging.info(f"Redirect URI: {request.redirect_uri or 'postmessage'}")

        # Log the client ID being used
        logging.info(f"Using client ID: {GOOGLE_CLIENT_ID}")
        logging.info(
            f"Environment GOOGLE_CLIENT_ID: {os.environ.get('GOOGLE_CLIENT_ID')}"
        )
        logging.info(
            f"Received auth code request with redirect_uri: {request.redirect_uri}"
        )
        logging.info("Loading credentials from credentials.json")
        flow = Flow.from_client_secrets_file(
            "credentials.json",
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/gmail.readonly",
            ],
        )
        logging.info(f"Flow created with client_id: {flow.client_config['client_id']}")
        flow.redirect_uri = request.redirect_uri or "postmessage"
        logging.info(f"Set redirect URI to: {flow.redirect_uri}")

        try:
            logging.info("Attempting to fetch token...")
            flow.fetch_token(code=request.code)
            logging.info("Token fetch successful")
        except Exception as e:
            logging.error(f"Token fetch failed: {str(e)}")
            logging.error(
                f"Flow configuration: {json.dumps(flow.client_config, indent=2)}"
            )
            raise

        creds = flow.credentials
        logging.info(f"Got credentials with token: {creds.token[:10]}...")
        if not creds.refresh_token:
            logging.warning("No refresh token returned")
            raise HTTPException(status_code=400, detail="No refresh token returned")

        logging.info("Verifying ID token...")
        idinfo = id_token.verify_oauth2_token(
            creds.id_token, requests.Request(), GOOGLE_CLIENT_ID
        )
        logging.info("ID token verified successfully")

        user_id = idinfo["sub"]
        email = idinfo["email"]
        picture = idinfo.get("picture", "")
        name = idinfo.get("name", "")

        logging.info(f"User authenticated: {email}")

        user_session = UserSession(user_id, creds)
        await session_manager.store_session(user_id, user_session)
        logging.info(f"Stored session for user {user_id}")

        return JSONResponse(
            content={
                "user_id": user_id,
                "email": email,
                "picture": picture,
                "name": name,
            },
            headers={
                "Cache-Control": "no-store",
                "Pragma": "no-cache",
                "X-Session-ID": user_id,  # Add session ID to headers
            },
        )
    except Exception as e:
        logging.error(f"Authentication error: {str(e)}")
        if isinstance(e, ValidationError):
            logging.error("Validation error details:", exc_info=True)
            return JSONResponse(
                status_code=422,
                content={"detail": "Invalid request format", "errors": e.errors()},
            )
        if "invalid_grant" in str(e):
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        logging.error("Unexpected error:", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Authentication failed. Please try again."
        )
