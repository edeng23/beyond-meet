from sqlalchemy import create_engine, Column, String, Table, MetaData
from sqlalchemy.dialects.postgresql import JSONB

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Define the graph table with user_id
graph_table = Table(
    "graph",
    metadata,
    Column("id", String, primary_key=True),
    Column("user_id", String, nullable=False),
    Column("data", JSONB),
)
