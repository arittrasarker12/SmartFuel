import sqlite3
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "smartfuel.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer', 'manager', 'admin')),
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Stations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stations (
        station_id INTEGER PRIMARY KEY AUTOINCREMENT,
        manager_id INTEGER NOT NULL REFERENCES users(user_id),
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        license_no TEXT NOT NULL,
        verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
        verified_by INTEGER REFERENCES users(user_id),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Fuel Grades table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fuel_grades (
        grade_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    );
    """)

    # 4. Fuel Prices table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fuel_prices (
        price_id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade_id INTEGER NOT NULL REFERENCES fuel_grades(grade_id),
        price_per_litre REAL NOT NULL CHECK(price_per_litre >= 0),
        effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        set_by INTEGER REFERENCES users(user_id)
    );
    """)

    # 5. Inventory table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL REFERENCES stations(station_id),
        grade_id INTEGER NOT NULL REFERENCES fuel_grades(grade_id),
        current_litres REAL NOT NULL CHECK(current_litres >= 0),
        reserved_litres REAL DEFAULT 0 CHECK(reserved_litres >= 0),
        capacity_litres REAL NOT NULL CHECK(capacity_litres > 0),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(user_id),
        UNIQUE(station_id, grade_id)
    );
    """)

    # 6. Inventory Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL REFERENCES stations(station_id),
        grade_id INTEGER NOT NULL REFERENCES fuel_grades(grade_id),
        litres REAL NOT NULL,
        action TEXT DEFAULT 'UPDATE',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recorded_by INTEGER REFERENCES users(user_id)
    );
    """)

    # 7. Sales Records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales_records (
        sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL REFERENCES stations(station_id),
        grade_id INTEGER NOT NULL REFERENCES fuel_grades(grade_id),
        litres_sold REAL NOT NULL CHECK(litres_sold > 0),
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        period_start TIMESTAMP,
        period_end TIMESTAMP,
        recorded_by INTEGER REFERENCES users(user_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 8. App Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema initialized successfully.")
