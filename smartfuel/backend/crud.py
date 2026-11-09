from datetime import datetime, timezone, timedelta
from backend.database import get_db

STALE_HOURS_THRESHOLD = 6.0  # SRS FR-C2: Availability data older than 6 hours is marked stale

def parse_iso_datetime(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        # Replace space with T if needed
        clean = dt_str.replace(" ", "T")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

def compute_fuel_status(current_litres: float, capacity_litres: float, updated_at_str: str) -> dict:
    """
    Computes stock status, percentage, and stale data flag per SRS FR-C1, FR-C2, FR-C6.
    """
    pct = round((current_litres / capacity_litres) * 100, 1) if capacity_litres > 0 else 0
    is_stale = False
    now = datetime.now(timezone.utc)

    dt = parse_iso_datetime(updated_at_str)
    hours_ago = 0.0
    time_label = "Never updated"
    if dt:
        delta = now - dt
        hours_ago = delta.total_seconds() / 3600.0
        if delta.total_seconds() < 60:
            time_label = "Just now"
        elif delta.total_seconds() < 3600:
            mins = int(delta.total_seconds() / 60)
            time_label = f"{mins} min{'s' if mins > 1 else ''} ago"
        elif hours_ago < 24:
            hrs = int(hours_ago)
            time_label = f"{hrs} hour{'s' if hrs > 1 else ''} ago"
        else:
            days = int(hours_ago / 24)
            time_label = f"{days} day{'s' if days > 1 else ''} ago"

        if hours_ago > STALE_HOURS_THRESHOLD:
            is_stale = True

    if is_stale:
        status = "stale"
        status_label = "Unreliable (Stale > 6h)"
        badge_color = "amber"
    elif current_litres <= 0:
        status = "out"
        status_label = "Out of Stock"
        badge_color = "red"
    elif current_litres <= (capacity_litres * 0.20):
        status = "low"
        status_label = "Low Stock"
        badge_color = "yellow"
    else:
        status = "available"
        status_label = "Available"
        badge_color = "green"

    return {
        "status": status,
        "status_label": status_label,
        "badge_color": badge_color,
        "percentage": pct,
        "is_stale": is_stale,
        "hours_ago": round(hours_ago, 1),
        "time_label": time_label
    }

# -------------------------------------------------------------
# FEATURE 3: View Fuel Availability (Customer) - SRS FR-C1, C2, C6, C7
# -------------------------------------------------------------
def get_customer_stations_availability(grade_filter: str = None, search: str = None):
    """
    Returns all verified stations with their fuel-grade availability, prices, and status.
    Implements SRS FR-C1, FR-C2, FR-C6.
    """
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT s.station_id, s.name as station_name, s.address, s.latitude, s.longitude, 
               s.license_no, s.verification_status, u.name as manager_name, u.phone as manager_phone
        FROM stations s
        JOIN users u ON s.manager_id = u.user_id
        WHERE s.verification_status = 'verified'
    """
    params = []
    if search:
        query += " AND (s.name LIKE ? OR s.address LIKE ?)"
        search_param = f"%{search.strip()}%"
        params.extend([search_param, search_param])

    query += " ORDER BY s.name ASC"
    cursor.execute(query, params)
    station_rows = cursor.fetchall()

    stations_list = []
    for s in station_rows:
        st_id = s["station_id"]
        # Fetch inventory for all fuel grades with current prices
        cursor.execute("""
            SELECT fg.grade_id, fg.name as grade_name, 
                   COALESCE(i.current_litres, 0) as current_litres,
                   COALESCE(i.reserved_litres, 0) as reserved_litres,
                   COALESCE(i.capacity_litres, 10000) as capacity_litres,
                   i.updated_at,
                   COALESCE(fp.price_per_litre, 0) as official_price
            FROM fuel_grades fg
            LEFT JOIN inventory i ON i.grade_id = fg.grade_id AND i.station_id = ?
            LEFT JOIN fuel_prices fp ON fp.grade_id = fg.grade_id
            ORDER BY fg.grade_id ASC
        """, (st_id,))
        grade_rows = cursor.fetchall()

        grades_data = []
        matches_grade_filter = False

        for g in grade_rows:
            status_info = compute_fuel_status(g["current_litres"], g["capacity_litres"], g["updated_at"])
            available_now = max(0.0, g["current_litres"] - g["reserved_litres"])

            item = {
                "grade_id": g["grade_id"],
                "grade_name": g["grade_name"],
                "current_litres": round(g["current_litres"], 1),
                "reserved_litres": round(g["reserved_litres"], 1),
                "available_now": round(available_now, 1),
                "capacity_litres": round(g["capacity_litres"], 1),
                "official_price": round(g["official_price"], 2),
                "updated_at": g["updated_at"],
                "status": status_info["status"],
                "status_label": status_info["status_label"],
                "badge_color": status_info["badge_color"],
                "percentage": status_info["percentage"],
                "is_stale": status_info["is_stale"],
                "time_label": status_info["time_label"]
            }

            if grade_filter:
                if g["grade_name"].lower() == grade_filter.lower() and status_info["status"] == "available":
                    matches_grade_filter = True

            grades_data.append(item)

        if grade_filter and not matches_grade_filter:
            continue

        stations_list.append({
            "station_id": s["station_id"],
            "name": s["station_name"],
            "address": s["address"],
            "latitude": s["latitude"],
            "longitude": s["longitude"],
            "license_no": s["license_no"],
            "manager_name": s["manager_name"],
            "manager_phone": s["manager_phone"],
            "grades": grades_data
        })

    conn.close()
    return stations_list

def get_system_stock_summary():
    """
    Implements SRS FR-C7:
    Shows total litres currently available for each fuel grade across all verified stations
    with non-stale data, and number of stations that have it.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fg.grade_id, fg.name as grade_name,
               COALESCE(fp.price_per_litre, 0) as official_price,
               i.current_litres, i.capacity_litres, i.updated_at, s.verification_status
        FROM fuel_grades fg
        LEFT JOIN fuel_prices fp ON fp.grade_id = fg.grade_id
        LEFT JOIN inventory i ON i.grade_id = fg.grade_id
        LEFT JOIN stations s ON s.station_id = i.station_id AND s.verification_status = 'verified'
    """)
    rows = cursor.fetchall()
    conn.close()

    summary = {
        "Petrol": {"grade_name": "Petrol", "total_available_litres": 0.0, "active_stations": 0, "official_price": 0.0},
        "Octane": {"grade_name": "Octane", "total_available_litres": 0.0, "active_stations": 0, "official_price": 0.0},
        "Diesel": {"grade_name": "Diesel", "total_available_litres": 0.0, "active_stations": 0, "official_price": 0.0}
    }

    for r in rows:
        gname = r["grade_name"]
        if gname not in summary:
            summary[gname] = {"grade_name": gname, "total_available_litres": 0.0, "active_stations": 0, "official_price": r["official_price"]}
        summary[gname]["official_price"] = r["official_price"]

        if r["verification_status"] == "verified" and r["current_litres"] is not None:
            status_info = compute_fuel_status(r["current_litres"], r["capacity_litres"], r["updated_at"])
            # SRS FR-C7: include only up-to-date (non-stale) data
            if not status_info["is_stale"] and r["current_litres"] > 0:
                summary[gname]["total_available_litres"] += r["current_litres"]
                summary[gname]["active_stations"] += 1

    for k in summary:
        summary[k]["total_available_litres"] = round(summary[k]["total_available_litres"], 1)

    return list(summary.values())

# -------------------------------------------------------------
# FEATURE 1: Update Fuel Inventory (Station Manager) - SRS FR-S1, FR-S3
# -------------------------------------------------------------
def get_manager_station(manager_user_id: int):
    """Returns the station managed by this user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT station_id, manager_id, name, address, latitude, longitude, license_no, verification_status, created_at
        FROM stations WHERE manager_id = ?
    """, (manager_user_id,))
    station = cursor.fetchone()
    conn.close()
    return dict(station) if station else None

def get_station_inventory(station_id: int):
    """Returns current inventory of a station."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.inventory_id, i.station_id, i.grade_id, fg.name as grade_name,
               i.current_litres, i.reserved_litres, i.capacity_litres, i.updated_at,
               COALESCE(fp.price_per_litre, 0) as official_price
        FROM inventory i
        JOIN fuel_grades fg ON i.grade_id = fg.grade_id
        LEFT JOIN fuel_prices fp ON fp.grade_id = fg.grade_id
        WHERE i.station_id = ?
        ORDER BY fg.grade_id ASC
    """, (station_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        status_info = compute_fuel_status(r["current_litres"], r["capacity_litres"], r["updated_at"])
        result.append({
            "inventory_id": r["inventory_id"],
            "station_id": r["station_id"],
            "grade_id": r["grade_id"],
            "grade_name": r["grade_name"],
            "current_litres": round(r["current_litres"], 1),
            "reserved_litres": round(r["reserved_litres"], 1),
            "available_now": round(max(0.0, r["current_litres"] - r["reserved_litres"]), 1),
            "capacity_litres": round(r["capacity_litres"], 1),
            "official_price": round(r["official_price"], 2),
            "updated_at": r["updated_at"],
            "status": status_info["status"],
            "status_label": status_info["status_label"],
            "badge_color": status_info["badge_color"],
            "percentage": status_info["percentage"],
            "is_stale": status_info["is_stale"],
            "time_label": status_info["time_label"]
        })
    return result

def update_fuel_inventory(station_id: int, grade_id: int, new_litres: float, user_id: int) -> tuple[bool, str, dict | None]:
    """
    Implements SRS FR-S1 & FR-S3:
    Managers update available litres per grade. Validates non-negative & <= tank capacity.
    Saves timestamped inventory update and inventory_logs entry.
    """
    if new_litres is None:
        return False, "Litres value is required.", None

    try:
        new_litres = float(new_litres)
    except (ValueError, TypeError):
        return False, "Litres must be a valid numeric value.", None

    if new_litres < 0:
        return False, "Stock quantity cannot be negative (SRS FR-S3).", None

    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check station exists
        cursor.execute("SELECT verification_status FROM stations WHERE station_id = ?", (station_id,))
        st = cursor.fetchone()
        if not st:
            conn.close()
            return False, "Station not found.", None

        # Fetch current inventory record and capacity
        cursor.execute("""
            SELECT inventory_id, capacity_litres, current_litres 
            FROM inventory WHERE station_id = ? AND grade_id = ?
        """, (station_id, grade_id))
        inv = cursor.fetchone()

        if not inv:
            capacity = 10000.0
        else:
            capacity = inv["capacity_litres"]

        # SRS FR-S3: reject stock values above tank capacity
        if new_litres > capacity:
            conn.close()
            return False, f"Stock quantity ({new_litres} L) cannot exceed tank capacity ({capacity} L) (SRS FR-S3).", None

        now_str = datetime.now(timezone.utc).isoformat()

        if inv:
            cursor.execute("""
                UPDATE inventory 
                SET current_litres = ?, updated_at = ?, updated_by = ?
                WHERE station_id = ? AND grade_id = ?
            """, (new_litres, now_str, user_id, station_id, grade_id))
        else:
            cursor.execute("""
                INSERT INTO inventory (station_id, grade_id, current_litres, reserved_litres, capacity_litres, updated_at, updated_by)
                VALUES (?, ?, ?, 0, ?, ?, ?)
            """, (station_id, grade_id, new_litres, capacity, now_str, user_id))

        # Log into INVENTORY_LOG (SRS Table 7.4)
        cursor.execute("""
            INSERT INTO inventory_logs (station_id, grade_id, litres, action, recorded_at, recorded_by)
            VALUES (?, ?, ?, 'UPDATE', ?, ?)
        """, (station_id, grade_id, new_litres, now_str, user_id))

        conn.commit()

        # Fetch fuel grade name
        cursor.execute("SELECT name FROM fuel_grades WHERE grade_id = ?", (grade_id,))
        gname = cursor.fetchone()["name"]

        conn.close()
        return True, f"Inventory for {gname} successfully updated to {new_litres} L.", {
            "station_id": station_id,
            "grade_id": grade_id,
            "grade_name": gname,
            "current_litres": new_litres,
            "capacity_litres": capacity,
            "updated_at": now_str
        }
    except Exception as e:
        conn.rollback()
        conn.close()
        return False, f"Database error: {str(e)}", None

# -------------------------------------------------------------
# FEATURE 2: Record Fuel Sales (Station Manager) - SRS FR-S2, FR-S3
# -------------------------------------------------------------
def record_fuel_sales(station_id: int, grade_id: int, litres_sold: float, user_id: int, period_start: str = None, period_end: str = None) -> tuple[bool, str, dict | None]:
    """
    Implements SRS FR-S2 & FR-S3:
    Managers record litres sold for a fuel grade and time period.
    Validates input and ensures stock is sufficient.
    Deducts sold litres from inventory and logs sales record & inventory log.
    """
    if litres_sold is None:
        return False, "Litres sold is required.", None

    try:
        litres_sold = float(litres_sold)
    except (ValueError, TypeError):
        return False, "Litres sold must be a numeric value.", None

    if litres_sold <= 0:
        return False, "Litres sold must be greater than zero.", None

    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check current stock
        cursor.execute("""
            SELECT current_litres, capacity_litres 
            FROM inventory 
            WHERE station_id = ? AND grade_id = ?
        """, (station_id, grade_id))
        inv = cursor.fetchone()
        if not inv:
            conn.close()
            return False, "No inventory record found for this fuel grade.", None

        current_stock = inv["current_litres"]
        if litres_sold > current_stock:
            conn.close()
            return False, f"Cannot record sale of {litres_sold} L. Current available stock is only {current_stock} L.", None

        # Fetch official fuel price
        cursor.execute("SELECT price_per_litre FROM fuel_prices WHERE grade_id = ?", (grade_id,))
        price_row = cursor.fetchone()
        unit_price = price_row["price_per_litre"] if price_row else 125.0
        total_price = round(litres_sold * unit_price, 2)

        now_str = datetime.now(timezone.utc).isoformat()
        if not period_start:
            period_start = now_str
        if not period_end:
            period_end = now_str

        # 1. Insert into sales_records
        cursor.execute("""
            INSERT INTO sales_records (station_id, grade_id, litres_sold, unit_price, total_price, period_start, period_end, recorded_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (station_id, grade_id, litres_sold, unit_price, total_price, period_start, period_end, user_id, now_str))
        sale_id = cursor.lastrowid

        # 2. Deduct from inventory
        new_stock = round(current_stock - litres_sold, 2)
        cursor.execute("""
            UPDATE inventory
            SET current_litres = ?, updated_at = ?, updated_by = ?
            WHERE station_id = ? AND grade_id = ?
        """, (new_stock, now_str, user_id, station_id, grade_id))

        # 3. Log into inventory_logs
        cursor.execute("""
            INSERT INTO inventory_logs (station_id, grade_id, litres, action, recorded_at, recorded_by)
            VALUES (?, ?, ?, 'SALE_DEDUCTION', ?, ?)
        """, (station_id, grade_id, new_stock, now_str, user_id))

        conn.commit()

        # Grade name
        cursor.execute("SELECT name FROM fuel_grades WHERE grade_id = ?", (grade_id,))
        gname = cursor.fetchone()["name"]
        conn.close()

        return True, f"Sale recorded: {litres_sold} L of {gname} for BDT {total_price:,.2f}. Remaining stock: {new_stock} L.", {
            "sale_id": sale_id,
            "station_id": station_id,
            "grade_id": grade_id,
            "grade_name": gname,
            "litres_sold": litres_sold,
            "unit_price": unit_price,
            "total_price": total_price,
            "remaining_stock": new_stock,
            "timestamp": now_str
        }
    except Exception as e:
        conn.rollback()
        conn.close()
        return False, f"Database error: {str(e)}", None

def get_station_sales_history(station_id: int, limit: int = 50):
    """Fetches recent sales records for a station."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sr.sale_id, sr.station_id, sr.grade_id, fg.name as grade_name,
               sr.litres_sold, sr.unit_price, sr.total_price, sr.period_start, sr.period_end,
               sr.created_at, u.name as recorded_by_name
        FROM sales_records sr
        JOIN fuel_grades fg ON sr.grade_id = fg.grade_id
        JOIN users u ON sr.recorded_by = u.user_id
        WHERE sr.station_id = ?
        ORDER BY sr.sale_id DESC
        LIMIT ?
    """, (station_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_station_inventory_logs(station_id: int, limit: int = 50):
    """Fetches inventory update history for a station."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT il.log_id, il.station_id, il.grade_id, fg.name as grade_name,
               il.litres, il.action, il.recorded_at, u.name as recorded_by_name
        FROM inventory_logs il
        JOIN fuel_grades fg ON il.grade_id = fg.grade_id
        JOIN users u ON il.recorded_by = u.user_id
        WHERE il.station_id = ?
        ORDER BY il.log_id DESC
        LIMIT ?
    """, (station_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# -------------------------------------------------------------
# ADMIN FUNCTIONS - SRS FR-A2, FR-A3, FR-D1, FR-D2, FR-S5
# -------------------------------------------------------------
def get_admin_dashboard_stats():
    """Returns overview statistics for Admin."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM users")
    total_users = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM stations")
    total_stations = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM stations WHERE verification_status = 'verified'")
    verified_stations = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM stations WHERE verification_status = 'pending'")
    pending_stations = cursor.fetchone()["total"]

    cursor.execute("SELECT COALESCE(SUM(litres_sold), 0) as total_sold, COALESCE(SUM(total_price), 0) as total_rev FROM sales_records")
    sales = cursor.fetchone()

    cursor.execute("""
        SELECT COALESCE(SUM(i.current_litres), 0) as total_inventory
        FROM inventory i
        JOIN stations s ON s.station_id = i.station_id
        WHERE s.verification_status = 'verified'
    """)
    total_inventory = cursor.fetchone()["total_inventory"]

    conn.close()
    return {
        "total_users": total_users,
        "total_stations": total_stations,
        "verified_stations": verified_stations,
        "pending_stations": pending_stations,
        "total_sales_litres": round(sales["total_sold"], 1),
        "total_sales_revenue": round(sales["total_rev"], 2),
        "total_inventory_litres": round(total_inventory, 1)
    }

def get_all_stations_admin():
    """Returns all stations for admin review and status management."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.station_id, s.name, s.address, s.latitude, s.longitude, 
               s.license_no, s.verification_status, s.verified_at, s.created_at,
               u.user_id as manager_id, u.name as manager_name, u.email as manager_email, u.phone as manager_phone
        FROM stations s
        JOIN users u ON s.manager_id = u.user_id
        ORDER BY s.station_id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def set_station_verification_status(station_id: int, status: str, admin_user_id: int) -> tuple[bool, str]:
    """Implements SRS FR-A2: Admin reviews & updates station verification status."""
    if status not in ("verified", "pending", "rejected"):
        return False, "Invalid status. Must be verified, pending, or rejected."

    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        UPDATE stations 
        SET verification_status = ?, verified_by = ?, verified_at = ?
        WHERE station_id = ?
    """, (status, admin_user_id, now_str, station_id))
    conn.commit()
    conn.close()
    return True, f"Station status updated to {status}."

def get_official_fuel_prices():
    """Returns official fuel prices (FR-S5)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT fp.price_id, fp.grade_id, fg.name as grade_name, fp.price_per_litre, fp.effective_from
        FROM fuel_prices fp
        JOIN fuel_grades fg ON fp.grade_id = fg.grade_id
        ORDER BY fg.grade_id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_official_fuel_price(grade_id: int, new_price: float, admin_user_id: int) -> tuple[bool, str]:
    """Implements SRS FR-D2 & FR-S5: Admin manages official fuel prices."""
    if new_price is None or float(new_price) < 0:
        return False, "Fuel price must be non-negative."

    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        UPDATE fuel_prices 
        SET price_per_litre = ?, effective_from = ?, set_by = ?
        WHERE grade_id = ?
    """, (float(new_price), now_str, admin_user_id, grade_id))
    conn.commit()
    conn.close()
    return True, f"Official price updated to BDT {new_price:.2f}/L."
