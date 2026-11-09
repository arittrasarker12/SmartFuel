import os
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from backend.database import init_db
from backend.auth import (
    register_user,
    authenticate_user,
    verify_access_token
)
from backend.models import (
    RegisterRequest,
    LoginRequest,
    UpdateInventoryRequest,
    RecordSaleRequest,
    VerifyStationRequest,
    UpdatePriceRequest
)
from backend.crud import (
    get_customer_stations_availability,
    get_system_stock_summary,
    get_manager_station,
    get_station_inventory,
    update_fuel_inventory,
    record_fuel_sales,
    get_station_sales_history,
    get_station_inventory_logs,
    get_admin_dashboard_stats,
    get_all_stations_admin,
    set_station_verification_status,
    get_official_fuel_prices,
    update_official_fuel_price
)
from seed import seed_database

# Ensure database and seed exist
init_db()
seed_database()

app = FastAPI(
    title="SmartFuel - Fuel Availability & Management Platform",
    description="SE331 Capstone Project API supporting Customer, Station Manager, and Admin roles.",
    version="1.0.0"
)

# Enable CORS for browser access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# -------------------------------------------------------------
# Dependency: Current User Authentication
# -------------------------------------------------------------
def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid."
        )
    token = auth_header.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again."
        )
    return payload

def require_role(allowed_roles: list[str]):
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}."
            )
        return user
    return role_checker

# -------------------------------------------------------------
# HTML UI Entrypoint
# -------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(TEMPLATES_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

# -------------------------------------------------------------
# AUTHENTICATION ENDPOINTS (Compulsory Module A)
# -------------------------------------------------------------
@app.post("/api/auth/register")
async def api_register(req: RegisterRequest):
    success, msg, user_data = register_user(req.dict())
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg, "data": user_data}

@app.post("/api/auth/login")
async def api_login(req: LoginRequest):
    success, msg, user_data = authenticate_user(req.email, req.password)
    if not success:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)
    return {"success": True, "message": msg, "data": user_data}

@app.get("/api/auth/me")
async def api_me(user: dict = Depends(get_current_user)):
    return {"success": True, "data": user}

# -------------------------------------------------------------
# CUSTOMER ENDPOINTS (Feature 3: View Fuel Availability)
# -------------------------------------------------------------
@app.get("/api/customer/stations")
async def api_customer_stations(grade: str = None, search: str = None):
    stations = get_customer_stations_availability(grade_filter=grade, search=search)
    return {"success": True, "data": stations}

@app.get("/api/customer/summary")
async def api_customer_summary():
    summary = get_system_stock_summary()
    return {"success": True, "data": summary}

# -------------------------------------------------------------
# STATION MANAGER ENDPOINTS (Feature 1 & Feature 2)
# -------------------------------------------------------------
@app.get("/api/manager/station")
async def api_manager_station(user: dict = Depends(require_role(["manager", "admin"]))):
    station = get_manager_station(user["user_id"])
    if not station:
        raise HTTPException(status_code=404, detail="No station associated with this manager account.")
    return {"success": True, "data": station}

@app.get("/api/manager/inventory")
async def api_manager_inventory(user: dict = Depends(require_role(["manager", "admin"]))):
    station = get_manager_station(user["user_id"])
    if not station:
        raise HTTPException(status_code=404, detail="No station associated with this manager account.")
    inventory = get_station_inventory(station["station_id"])
    return {"success": True, "data": {"station": station, "inventory": inventory}}

# FEATURE 1: Update Fuel Inventory (Station Manager)
@app.post("/api/manager/inventory/update")
async def api_update_inventory(req: UpdateInventoryRequest, user: dict = Depends(require_role(["manager", "admin"]))):
    station = get_manager_station(user["user_id"])
    # If not admin, ensure manager only updates their own station
    if user["role"] == "manager":
        if not station or station["station_id"] != req.station_id:
            raise HTTPException(status_code=403, detail="You can only update inventory for your own assigned station (SRS NFR-S3).")

    success, msg, data = update_fuel_inventory(
        station_id=req.station_id,
        grade_id=req.grade_id,
        new_litres=req.current_litres,
        user_id=user["user_id"]
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "data": data}

# FEATURE 2: Record Fuel Sales (Station Manager)
@app.post("/api/manager/sales/record")
async def api_record_sales(req: RecordSaleRequest, user: dict = Depends(require_role(["manager", "admin"]))):
    station = get_manager_station(user["user_id"])
    # If not admin, ensure manager only records sales for their own station
    if user["role"] == "manager":
        if not station or station["station_id"] != req.station_id:
            raise HTTPException(status_code=403, detail="You can only record sales for your own assigned station (SRS NFR-S3).")

    success, msg, data = record_fuel_sales(
        station_id=req.station_id,
        grade_id=req.grade_id,
        litres_sold=req.litres_sold,
        user_id=user["user_id"],
        period_start=req.period_start,
        period_end=req.period_end
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "data": data}

@app.get("/api/manager/sales/history")
async def api_sales_history(user: dict = Depends(require_role(["manager", "admin"]))):
    station = get_manager_station(user["user_id"])
    if not station:
        raise HTTPException(status_code=404, detail="No station associated with this manager account.")
    history = get_station_sales_history(station["station_id"])
    return {"success": True, "data": history}

@app.get("/api/manager/inventory/logs")
async def api_inventory_logs(user: dict = Depends(require_role(["manager", "admin"]))):
    station = get_manager_station(user["user_id"])
    if not station:
        raise HTTPException(status_code=404, detail="No station associated with this manager account.")
    logs = get_station_inventory_logs(station["station_id"])
    return {"success": True, "data": logs}

# -------------------------------------------------------------
# ADMIN ENDPOINTS (Admin Side & Official Prices)
# -------------------------------------------------------------
@app.get("/api/admin/stats")
async def api_admin_stats(user: dict = Depends(require_role(["admin"]))):
    stats = get_admin_dashboard_stats()
    return {"success": True, "data": stats}

@app.get("/api/admin/stations")
async def api_admin_stations(user: dict = Depends(require_role(["admin"]))):
    stations = get_all_stations_admin()
    return {"success": True, "data": stations}

@app.post("/api/admin/stations/verify")
async def api_verify_station(req: VerifyStationRequest, user: dict = Depends(require_role(["admin"]))):
    success, msg = set_station_verification_status(req.station_id, req.status, user["user_id"])
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}

@app.get("/api/admin/prices")
async def api_admin_prices(user: dict = Depends(require_role(["admin"]))):
    prices = get_official_fuel_prices()
    return {"success": True, "data": prices}

@app.post("/api/admin/prices/update")
async def api_update_price(req: UpdatePriceRequest, user: dict = Depends(require_role(["admin"]))):
    success, msg = update_official_fuel_price(req.grade_id, req.new_price, user["user_id"])
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}

if __name__ == "__main__":
    import uvicorn
    print("\n=======================================================")
    print("   Starting SmartFuel Server (FastAPI + SQLite)")
    print("   Open your browser at: http://127.0.0.1:8000")
    print("=======================================================\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
