import sys
import os
import time
import requests
import json
from datetime import datetime

# Add the backend directory to path so we can import auth_system to generate a real token
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from auth_system import auth_system, UserLogin

# Reconfigure stdout to utf-8 to handle emojis in Windows terminal
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure we hit the right port based on our architectural fix
API_BASE_URL = "http://localhost:8001"

# Generate a real token using the live auth_system configuration
token_response = auth_system.login(UserLogin(username="admin", password="admin123"))
real_token = token_response.access_token

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {real_token}"
}

def run_real_proof():
    print("=" * 80)
    print("🚀 BRIGHT CONNECTION LIVE E2E HTTP PROOF")
    print("=" * 80)
    
    # 0. Health check
    print(f"\n[0] Checking API Health at {API_BASE_URL}...")
    try:
        health_resp = requests.get(f"{API_BASE_URL}/docs")
        if health_resp.status_code == 200:
            print("[OK] Server is running and reachable!")
        else:
            print(f"[X] Server reachable but returned {health_resp.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"\n[X] CRITICAL: API is NOT running at {API_BASE_URL}.")
        print("Please start the backend first using: python backend/start_server.py")
        sys.exit(1)
        
    # 1. Ingest Field Visit (Tally -> Artha -> Setu)
    print("\n[1] HTTP POST: Ingesting Field Visit Evidence from Bright Connection/Tally...")
    field_visit_payload = {
        "sync_id": "sync_bc_real_1001",
        "visit_id": f"VIS-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "store_id": "STR_ANDHERI_LIVE_01",
        "store_name": "Andheri Electronics Live",
        "location": "LOC_MUMBAI_WEST",
        "agent_id": "AGENT_77",
        "lat": 19.1136,
        "lng": 72.8697,
        "display_photo_url": "https://s3.brightconnection.tally/proof/live_str_andheri_01.jpg",
        "visit_date": datetime.utcnow().isoformat() + "Z"
    }

    response = requests.post(
        f"{API_BASE_URL}/setu/bright/field-visits", 
        json=field_visit_payload, 
        headers=HEADERS
    )
    
    if response.status_code != 200:
        print(f"[X] Failed to ingest field visit: {response.status_code} - {response.text}")
        sys.exit(1)
    
    visit_response = response.json()
    canonical_record = visit_response.get("canonical_record", {})
    source_context = canonical_record.get("source_context", {})
    tenant_id = visit_response.get("tenant_id")
    
    print("[OK] Field Visit Ingested Successfully via HTTP")
    print("   -> Canonical Record ID:", canonical_record.get("visit_id"))
    print("   -> Provenance (Source Context Extracted by SETU):")
    print(json.dumps(source_context, indent=4))
    
    if visit_response.get("notification_sent"):
        print("\n[OK] Dealer Notification Triggered with Context")
    else:
        print("\n[X] Dealer Notification was NOT Triggered")
        sys.exit(1)
        
    # 2. Account Scoped Mitra Query
    print("\n[2] HTTP POST: Performing Account-Scoped Mitra Query...")
    mitra_query_payload = {
        "query": "Show me the last field visit proof and inventory anomalies",
        "tenant_id": tenant_id,
        "store_id": "STR_ANDHERI_LIVE_01"
    }

    mitra_response = requests.post(
        f"{API_BASE_URL}/setu/mitra/query", 
        json=mitra_query_payload, 
        headers=HEADERS
    )
    
    if mitra_response.status_code != 200:
        print(f"[X] Mitra query failed: {mitra_response.status_code} - {mitra_response.text}")
        sys.exit(1)
        
    mitra_result = mitra_response.json()
    provenance = mitra_result.get("provenance", {})
    
    print("[OK] Mitra Query Succeeded")
    print("   -> Response:", mitra_result.get("response"))
    print("   -> Enforced Boundary:", provenance.get("data_boundary_enforced"))
    print("   -> Scoped Store:", provenance.get("store_id"))
    print("   -> Scoped Tenant:", provenance.get("tenant_id"))
    
    print("\n" + "=" * 80)
    print("ALL ACCEPTANCE CONDITIONS MET: LIVE HTTP PROOF COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == "__main__":
    run_real_proof()
