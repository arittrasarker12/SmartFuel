import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_flow():
    print("--- 1. Testing Customer View (Feature 3) ---")
    res = client.get("/api/customer/stations")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    print(f"Customer Stations found: {len(data['data'])}")
    for s in data['data']:
        print(f"  Station: {s['name']} (Grades: {len(s['grades'])})")

    res_sum = client.get("/api/customer/summary")
    assert res_sum.status_code == 200
    print(f"System summary: {res_sum.json()['data']}")

    print("\n--- 2. Testing Authentication (Compulsory Module A) ---")
    login_res = client.post("/api/auth/login", json={
        "email": "manager@dhakaoil.com",
        "password": "Manager@123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["data"]["token"]
    print(f"Manager login successful! Token generated.")

    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 3. Testing Feature 1: Update Fuel Inventory (Station Manager) ---")
    # First get inventory
    inv_res = client.get("/api/manager/inventory", headers=headers)
    assert inv_res.status_code == 200
    station_id = inv_res.json()["data"]["station"]["station_id"]
    print(f"Manager Station ID: {station_id}")

    # Update Petrol inventory to 7500.0 L
    upd_res = client.post("/api/manager/inventory/update", headers=headers, json={
        "station_id": station_id,
        "grade_id": 1,
        "current_litres": 7500.0
    })
    assert upd_res.status_code == 200
    print(f"Update Result: {upd_res.json()['message']}")

    # Verify invalid update (negative stock - SRS FR-S3)
    bad_res = client.post("/api/manager/inventory/update", headers=headers, json={
        "station_id": station_id,
        "grade_id": 1,
        "current_litres": -50.0
    })
    assert bad_res.status_code == 422 or bad_res.status_code == 400
    print(f"Negative stock correctly rejected: {bad_res.status_code}")

    print("\n--- 4. Testing Feature 2: Record Fuel Sales (Station Manager) ---")
    sale_res = client.post("/api/manager/sales/record", headers=headers, json={
        "station_id": station_id,
        "grade_id": 1,
        "litres_sold": 50.0
    })
    assert sale_res.status_code == 200
    print(f"Sale recorded: {sale_res.json()['message']}")

    # Check sales history
    hist_res = client.get("/api/manager/sales/history", headers=headers)
    assert hist_res.status_code == 200
    print(f"Sales history count: {len(hist_res.json()['data'])}")

    print("\n--- 5. Testing Admin Verification (SRS FR-A2, FR-A3) ---")
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@smartfuel.com",
        "password": "Admin@123"
    })
    admin_token = admin_login.json()["data"]["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Verify Mirpur station (ID 3)
    ver_res = client.post("/api/admin/stations/verify", headers=admin_headers, json={
        "station_id": 3,
        "status": "verified"
    })
    assert ver_res.status_code == 200
    print(f"Admin verified station 3: {ver_res.json()['message']}")

    # Customer view should now show 3 stations
    c_res2 = client.get("/api/customer/stations")
    assert len(c_res2.json()["data"]) == 3
    print(f"Customer stations now includes newly verified station! Count: {len(c_res2.json()['data'])}")

    print("\nALL TEST CASES PASSED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    test_flow()
