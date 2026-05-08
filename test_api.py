import os
import requests
import time
from supabase import create_client

supabase_url = os.getenv("SUPABASE_URL", "https://ycgoqbizjjbnmnnsdxny.supabase.co")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_qUq66ICr7NOvD6XJzUJQBg_yFwMb0Tc")
supabase = create_client(supabase_url, supabase_key)

email = "testuser_v2@example.com"
password = "testpassword123"

try:
    auth_response = supabase.auth.sign_up({"email": email, "password": password})
    print("Signup successful")
except Exception as e:
    print("Signup failed, trying to sign in:", e)
    auth_response = supabase.auth.sign_in_with_password({"email": email, "password": password})

token = auth_response.session.access_token

repo_data = {
    "full_name": "Life Quest",
    "scan_status": "pending",
    "node_count": 0,
    "default_branch": "main"
}
db_response = supabase.table("repos").insert(repo_data).execute()
repo_id = db_response.data[0]["id"]
print(f"Created Repo with ID: {repo_id}")

api_url = f"http://localhost:8001/repos/{repo_id}/scan"
payload = {
    "repo_id": repo_id,
    "repo_path": "/tmp/Life_Quest"
}
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print(f"Calling API: {api_url}")
scan_res = requests.post(api_url, json=payload, headers=headers)
print("Scan response:", scan_res.status_code, scan_res.text)

print("Waiting a bit for celery task to complete...")
time.sleep(10)

print(f"Go to http://localhost:3000/dashboard/{repo_id} to view the results.")
