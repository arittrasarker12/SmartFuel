import os
import sqlite3
from datetime import datetime, timezone, timedelta
from backend.database import DB_PATH, init_db, get_db
from backend.auth import hash_password

def seed_database():
    print("Initializing database schema...")
    init_db()

    conn = get_db()
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    if cursor.fetchone()["cnt"] > 0:
        print("Database already contains records. Skipping seed.")
        conn.close()
        return

    print("Seeding fuel grades and official prices...")
    grades = [
        (1, "Petrol", 125.0),
        (2, "Octane", 130.0),
        (3, "Diesel", 109.0)
    ]
    for gid, gname, price in grades:
        cursor.execute("INSERT INTO fuel_grades (grade_id, name) VALUES (?, ?)", (gid, gname))
        cursor.execute("""
            INSERT INTO fuel_prices (grade_id, price_per_litre, effective_from)
            VALUES (?, ?, ?)
        """, (gid, price, datetime.now(timezone.utc).isoformat()))

    print("Seeding initial users (hashed passwords with salted PBKDF2)...")
    users = [
        # Admin
        ("Engr. Rahat Kabir (Admin)", "admin@smartfuel.com", "01711000001", "Admin@123", "admin"),
        # Manager 1 (Dhanmondi - Verified)
        ("Arittra Sarker (Manager)", "manager@dhakaoil.com", "01811000002", "Manager@123", "manager"),
        # Manager 2 (Gulshan - Verified)
        ("Rafiqul Islam (Manager)", "manager2@gulshan.com", "01911000003", "Manager@123", "manager"),
        # Manager 3 (Mirpur - Pending Verification)
        ("Kabir Hossain (Manager)", "manager3@mirpur.com", "01611000004", "Manager@123", "manager"),
        # Customer
        ("Tanvir Ahmed (Customer)", "customer@gmail.com", "01511000005", "Customer@123", "customer"),
    ]

    user_ids = {}
    for name, email, phone, raw_pwd, role in users:
        pwd_hash, salt = hash_password(raw_pwd)
        cursor.execute("""
            INSERT INTO users (name, email, phone, password_hash, salt, role, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (name, email, phone, pwd_hash, salt, role))
        user_ids[email] = cursor.lastrowid

    admin_id = user_ids["admin@smartfuel.com"]
    mgr1_id = user_ids["manager@dhakaoil.com"]
    mgr2_id = user_ids["manager2@gulshan.com"]
    mgr3_id = user_ids["manager3@mirpur.com"]

    print("Seeding Dhaka fuel stations...")
    now_str = datetime.now(timezone.utc).isoformat()
    # Station 1: Dhanmondi (Verified)
    cursor.execute("""
        INSERT INTO stations (manager_id, name, address, latitude, longitude, license_no, verification_status, verified_by, verified_at)
        VALUES (?, 'Padma Oil Model Station - Dhanmondi', 'House 32, Road 7/A, Dhanmondi, Dhaka 1209', 23.7465, 90.3760, 'DHK-EXP-2024-0012', 'verified', ?, ?)
    """, (mgr1_id, admin_id, now_str))
    st1_id = cursor.lastrowid

    # Station 2: Gulshan (Verified)
    cursor.execute("""
        INSERT INTO stations (manager_id, name, address, latitude, longitude, license_no, verification_status, verified_by, verified_at)
        VALUES (?, 'Meghna Petroleum Filling Station - Gulshan 2', 'Plot 14, Madani Avenue, Gulshan 2, Dhaka 1212', 23.7925, 90.4167, 'DHK-EXP-2023-0889', 'verified', ?, ?)
    """, (mgr2_id, admin_id, now_str))
    st2_id = cursor.lastrowid

    # Station 3: Mirpur (Pending Verification - for Admin feature demonstration)
    cursor.execute("""
        INSERT INTO stations (manager_id, name, address, latitude, longitude, license_no, verification_status)
        VALUES (?, 'Jamuna Oil Center - Mirpur 10 Roundabout', 'Section 10, Mirpur Circle, Dhaka 1216', 23.8069, 90.3687, 'DHK-EXP-2026-9901', 'pending')
    """, (mgr3_id,))
    st3_id = cursor.lastrowid

    print("Seeding inventory and logs...")
    # Dhanmondi inventory (Good stock)
    st1_inventory = [
        (1, 6800.0, 10000.0), # Petrol
        (2, 8200.0, 12000.0), # Octane
        (3, 5400.0, 10000.0), # Diesel
    ]
    for gid, stock, cap in st1_inventory:
        cursor.execute("""
            INSERT INTO inventory (station_id, grade_id, current_litres, reserved_litres, capacity_litres, updated_at, updated_by)
            VALUES (?, ?, ?, 0, ?, ?, ?)
        """, (st1_id, gid, stock, cap, now_str, mgr1_id))
        cursor.execute("""
            INSERT INTO inventory_logs (station_id, grade_id, litres, action, recorded_at, recorded_by)
            VALUES (?, ?, ?, 'INITIAL_STOCK', ?, ?)
        """, (st1_id, gid, stock, now_str, mgr1_id))

    # Gulshan inventory (Tested for Out and Low badges)
    st2_inventory = [
        (1, 4500.0, 10000.0), # Petrol: Available
        (2, 0.0, 10000.0),    # Octane: Out of Stock
        (3, 1200.0, 10000.0), # Diesel: Low Stock (12% <= 20%)
    ]
    for gid, stock, cap in st2_inventory:
        cursor.execute("""
            INSERT INTO inventory (station_id, grade_id, current_litres, reserved_litres, capacity_litres, updated_at, updated_by)
            VALUES (?, ?, ?, 0, ?, ?, ?)
        """, (st2_id, gid, stock, cap, now_str, mgr2_id))
        cursor.execute("""
            INSERT INTO inventory_logs (station_id, grade_id, litres, action, recorded_at, recorded_by)
            VALUES (?, ?, ?, 'INITIAL_STOCK', ?, ?)
        """, (st2_id, gid, stock, now_str, mgr2_id))

    # Mirpur inventory (For when verified)
    for gid in (1, 2, 3):
        cursor.execute("""
            INSERT INTO inventory (station_id, grade_id, current_litres, reserved_litres, capacity_litres, updated_at, updated_by)
            VALUES (?, ?, 3000.0, 0, 10000.0, ?, ?)
        """, (st3_id, gid, now_str, mgr3_id))

    print("Seeding sample sales records for station 1...")
    sample_sales = [
        (st1_id, 2, 45.0, 130.0, 5850.0, "2026-11-08 08:30:00", "2026-11-08 09:00:00", mgr1_id),
        (st1_id, 1, 30.0, 125.0, 3750.0, "2026-11-08 10:15:00", "2026-11-08 10:45:00", mgr1_id),
        (st1_id, 3, 120.0, 109.0, 13080.0, "2026-11-08 14:00:00", "2026-11-08 15:00:00", mgr1_id),
        (st1_id, 2, 60.0, 130.0, 7800.0, "2026-11-08 17:30:00", "2026-11-08 18:00:00", mgr1_id),
    ]
    for st_id, gid, l_sold, uprice, tprice, pstart, pend, recby in sample_sales:
        cursor.execute("""
            INSERT INTO sales_records (station_id, grade_id, litres_sold, unit_price, total_price, period_start, period_end, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (st_id, gid, l_sold, uprice, tprice, pstart, pend, recby))

    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
