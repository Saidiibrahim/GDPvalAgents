import os
from supabase import create_client, Client

def get_supabase():
    """Get Supabase client with proper error handling for missing environment variables."""
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url:
        raise ValueError(
            "SUPABASE_URL environment variable is required. "
            "Please set it in your .env file or environment."
        )
    
    if not key:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY environment variable is required. "
            "Please set it in your .env file or environment."
        )
    
    return create_client(url, key)