from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse  # type: ignore[import]
from datetime import datetime, timedelta
import logging
from asyncio import Queue, sleep as asyncio_sleep
from typing import Dict, Any, AsyncGenerator
import json
import asyncio

from app.services.gmail_service import GmailService
from app.services.graph_service import GraphService
from app.services.email_processor import EmailProcessor
from app.services.session_manager import SessionManager

router = APIRouter()
session_manager = SessionManager()

generation_in_progress = {}

# Store progress queues and last generation times
progress_queues = {}
last_generation = {}
# Add a dictionary to track the current progress for each user
current_progress = {}


@router.get("/graph")
async def get_graph(user_id: str = None):
    """Get the user's graph"""
    try:
        logging.info(f"Getting graph for user {user_id}")
        if not user_id:
            raise HTTPException(status_code=401, detail="Please login first")

        session = await session_manager.get_session(user_id)
        logging.info(f"Got session for user {user_id}: {session is not None}")
        if not session:
            return JSONResponse(
                status_code=401,
                content={"detail": "Session expired. Please login again."},
            )

        graph_service = GraphService(user_id)
        graph_data = graph_service._load_graph()
        logging.info(f"Loaded graph for user {user_id}: {graph_data is not None}")

        if not graph_data:
            graph_data = {"nodes": [], "links": []}

        # If a generation is in progress for this user, pass that back in JSON
        is_generating = generation_in_progress.get(user_id, False)
        # Include the current progress in the response
        progress_value = current_progress.get(user_id, 0) if is_generating else 0

        return JSONResponse(
            content={
                "nodes": graph_data["nodes"],
                "links": graph_data["links"],
                "is_generating": is_generating,
                "current_progress": progress_value,
            },
            headers={
                "Cache-Control": "no-store",
                "Pragma": "no-cache",
                "X-Session-ID": user_id,
            },
        )
    except Exception as e:
        logging.error(f"Error getting graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/graph")
async def generate_graph(user_id: str):
    """Generate a new graph"""
    try:
        logging.info(f"Starting graph generation for user {user_id}")
        if user_id in last_generation:
            time_since_last = datetime.now() - last_generation[user_id]
            if time_since_last < timedelta(minutes=0.5):
                raise HTTPException(
                    status_code=429,
                    detail="Please wait 30 seconds between generations",
                )

        session = await session_manager.get_session(user_id)
        if not session:
            raise HTTPException(status_code=401, detail="Please login first")

        # Initialize progress tracking
        if user_id in progress_queues:
            del progress_queues[user_id]  # Clear any existing queue
        progress_queues[user_id] = Queue()
        last_generation[user_id] = datetime.now()
        # Reset the current progress
        current_progress[user_id] = 0

        generation_in_progress[user_id] = True

        try:
            logging.info("Creating services...")
            gmail_service = GmailService(session.credentials)
            graph_service = GraphService(user_id)
            email_processor = EmailProcessor(
                gmail_service, graph_service, progress_queues[user_id]
            )

            processed_emails = set()
            logging.info("Starting email processing...")
            await email_processor.process_emails(processed_emails)
            logging.info("Email processing complete")

            graph_service.save_graph()
            logging.info("Graph saved successfully")

            return {"status": "success", "processed_emails": len(processed_emails)}
        except Exception as e:
            # Make sure to clean up the queue if processing fails
            if user_id in progress_queues:
                del progress_queues[user_id]
            raise
        finally:
            # On success or fail, mark not in progress
            generation_in_progress[user_id] = False
    except Exception as e:
        logging.error(f"Error generating graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/progress")
async def graph_progress(user_id: str):
    """Stream graph generation progress."""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    if user_id not in progress_queues:
        progress_queues[user_id] = Queue()

    # If generation is in progress but we're reconnecting, send the current progress immediately
    if generation_in_progress.get(user_id, False) and user_id in current_progress:
        await progress_queues[user_id].put({"progress": current_progress[user_id]})

    async def event_generator():
        try:
            queue = progress_queues[user_id]
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=5)
                    # Store the progress value for reconnections
                    if "progress" in data and isinstance(data["progress"], int):
                        current_progress[user_id] = data["progress"]
                    yield {"event": "message", "data": json.dumps(data)}
                except asyncio.TimeoutError:
                    # Check if generation is still in progress
                    if not generation_in_progress.get(user_id, False):
                        break
                    yield {
                        "event": "message",
                        "data": json.dumps({"progress": "keep-alive"}),
                    }
        except Exception as e:
            logging.error(f"Error in progress stream: {e}")
            yield {"event": "error", "data": str(e)}
        finally:
            # Only remove from progress_queues if generation is complete
            if user_id in progress_queues and not generation_in_progress.get(
                user_id, False
            ):
                del progress_queues[user_id]

    return EventSourceResponse(event_generator())


@router.put("/graph/node/{node_id}")
async def update_node(node_id: str, node_data: dict = Body(...), user_id: str = None):
    """Update node metadata"""
    try:
        if not user_id:
            raise HTTPException(status_code=401, detail="Please login first")

        session = await session_manager.get_session(user_id)
        if not session:
            return JSONResponse(
                status_code=401,
                content={"detail": "Session expired. Please login again."},
            )

        graph_service = GraphService(user_id)
        logging.info(
            f"Updating node {node_id} for user {user_id} with data: {node_data}"
        )
        graph_service.update_node_metadata(node_id, node_data)
        graph_service.save_graph()

        logging.info(f"Node {node_id} updated successfully")
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Error updating node: {e}")
        raise HTTPException(status_code=500, detail=str(e))
