import os
from dotenv import load_dotenv
from utils.supabase import get_supabase

# Load environment variables from .env file
load_dotenv()

try:
    supabase = get_supabase()
    result = supabase.table("sites").select("*").execute()
    print("Supabase connection successful!")
    print("Sites table query result:")
    print(result.data)
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
    print("\nTo fix this:")
    print("1. Create a .env file in the project root")
    print("2. Add your Supabase URL and service role key:")
    print("   SUPABASE_URL=https://your-project-id.supabase.co")
    print("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here")