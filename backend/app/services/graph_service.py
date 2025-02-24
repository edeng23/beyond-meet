import logging
from app.database import engine, graph_table
from typing import Dict, Any, Optional


class GraphService:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.nodes = {}
        self.links = set()
        self._load_graph()

    def _load_graph(self) -> Dict[str, Any]:
        """Load graph from database"""
        try:
            with engine.connect() as conn:
                result = (
                    conn.execute(
                        graph_table.select().where(
                            graph_table.c.user_id == self.user_id
                        )
                    )
                    .mappings()
                    .first()
                )
                if result and result.get("data"):
                    data = result["data"]
                    # Ensure all nodes have the required metadata fields
                    for node in data["nodes"]:
                        if "meetings" not in node:
                            node["meetings"] = []
                        if "company" not in node:
                            node["company"] = ""
                        if "companyDomain" not in node:
                            node["companyDomain"] = ""
                        if "firstName" not in node:
                            node["firstName"] = ""
                        if "lastName" not in node:
                            node["lastName"] = ""
                        if "linkedinUrl" not in node:
                            node["linkedinUrl"] = ""
                        if "notes" not in node:
                            node["notes"] = ""

                    self.nodes = {node["id"]: node for node in data["nodes"]}
                    self.links = {
                        (link["source"], link["target"]) for link in data["links"]
                    }
                    return data  # Return the graph data
                return {"nodes": [], "links": []}  # Return empty graph if none exists
        except Exception as e:
            logging.error(f"Error loading graph: {e}", exc_info=True)
            return {"nodes": [], "links": []}  # Return empty graph on error

    def save_graph(self):
        """Save graph to database"""
        graph_data = {
            "nodes": list(self.nodes.values()),
            "links": [
                {"source": source, "target": target} for (source, target) in self.links
            ],
        }
        try:
            with engine.connect() as conn:
                with conn.begin():
                    conn.execute(
                        graph_table.delete().where(
                            graph_table.c.user_id == self.user_id
                        )
                    )
                    conn.execute(
                        graph_table.insert().values(
                            id=f"graph_{self.user_id}",
                            user_id=self.user_id,
                            data=graph_data,
                        )
                    )
                    conn.commit()
        except Exception as e:
            logging.error(f"Error saving graph: {e}")
            raise

    def add_node(self, email: str, name: str = None):
        """Add a node to the graph with extended metadata"""
        if email not in self.nodes:
            # Create node with extended metadata
            self.nodes[email] = {
                "id": email,
                "email": email,
                "name": name or email,
                # Additional metadata fields
                "company": "",
                "companyDomain": "",
                "firstName": "",
                "lastName": "",
                "linkedinUrl": "",
                "notes": "",
                "meetings": [],  # List of meeting objects
            }

    def add_link(self, source: str, target: str):
        """Add a link between two nodes"""
        if source != target:
            self.links.add((source, target))

    def add_meeting(self, email: str, meeting: Dict[str, Any]):
        """Add a meeting to a node's meeting list"""
        if email in self.nodes:
            # Ensure meeting has required fields
            meeting_data = {
                "date": meeting.get("date", ""),
                "title": meeting.get("title", ""),
                "location": meeting.get("location", ""),
            }
            self.nodes[email]["meetings"].append(meeting_data)

    def update_node_metadata(self, email: str, metadata: Dict[str, Any]):
        """Update a node's metadata"""
        if email in self.nodes:
            allowed_fields = [
                "company",
                "companyDomain",
                "firstName",
                "lastName",
                "linkedinUrl",
                "notes",
            ]
            for field in allowed_fields:
                if field in metadata:
                    self.nodes[email][field] = metadata[field]
