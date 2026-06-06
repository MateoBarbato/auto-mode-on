"""Supabase/Postgres access.

⚠️ P4 owns the canonical version of this module (see roles-and-ownership.md).
This is a minimal shared accessor so the other lanes can read/write the DB.
Coordinate with P4 before changing the connection strategy (Supabase client vs.
direct psycopg). Postgres is the source of truth — the schema is the contract.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_db() -> Client:
    """Return a process-wide Supabase client using the service-role key.

    Server-side only — the service-role key bypasses RLS, so this must never be
    exposed to the dashboard (the dashboard reads the DB with its own key).
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
