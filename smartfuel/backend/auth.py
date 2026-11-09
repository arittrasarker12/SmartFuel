import hashlib
import hmac
import base64
import json
import os
import re
import secrets
import time
from datetime import datetime, timezone
from backend.database import get_db

SECRET_KEY = os.environ.get("SMARTFUEL_SECRET_KEY", "smartfuel-capstone-secret-key-se331-fall2026")
TOKEN_EXPIRE_SECONDS = 1800  # 30 minutes (SRS NFR-S5)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def hash_password(password: str) -> tuple[str, str]:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return key.hex(), salt

def verify_password(stored_hash: str, salt: str, password_attempt: str) -> bool:
    """Verifies a password against the stored hash and salt using constant-time comparison."""
    attempt_key = hashlib.pbkdf2_hmac(
        'sha256',
        password_attempt.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return secrets.compare_digest(stored_hash, attempt_key.hex())

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _b64_decode(data_str: str) -> bytes:
    padding = '=' * (4 - len(data_str) % 4) if len(data_str) % 4 else ''
    return base64.urlsafe_b64decode((data_str + padding).encode('utf-8'))

def create_access_token(user_id: int, email: str, role: str, name: str) -> str:
    """Generates an RFC 7519 compliant signed JWT token with a 30-minute expiration."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "name": name,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS
    }
    encoded_header = _b64_encode(json.dumps(header).encode('utf-8'))
    encoded_payload = _b64_encode(json.dumps(payload).encode('utf-8'))
    signing_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    encoded_signature = _b64_encode(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def verify_access_token(token: str) -> dict | None:
    """Validates signature and expiration of JWT token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        encoded_header, encoded_payload, encoded_signature = parts
        signing_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_decode(encoded_signature)
        if not secrets.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64_decode(encoded_payload).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None # Expired
        return payload
    except Exception:
        return None

def validate_registration_input(data: dict) -> tuple[bool, str]:
    """Validates input fields for registration."""
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "").strip().lower()
    phone = (data.get("phone") or "").strip()

    if not name or len(name) < 2:
        return False, "Full Name must be at least 2 characters long."
    if not email or not EMAIL_REGEX.match(email):
        return False, "Please provide a valid email address (e.g. user@example.com)."
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return False, "Password must contain both letters and numbers."
    if role not in ("customer", "manager", "admin"):
        return False, "Invalid role selected. Must be Customer or Station Manager."

    if role == "manager":
        station_name = (data.get("station_name") or "").strip()
        address = (data.get("station_address") or "").strip()
        license_no = (data.get("license_no") or "").strip()
        if not station_name:
            return False, "Station Name is required for Station Manager registration."
        if not address:
            return False, "Station Address is required."
        if not license_no:
            return False, "Trade/Operating License Number is required for station verification."

    return True, ""

def register_user(data: dict) -> tuple[bool, str, dict | None]:
    """Registers a new user and station if manager."""
    is_valid, err = validate_registration_input(data)
    if not is_valid:
        return False, err, None

    name = data["name"].strip()
    email = data["email"].strip().lower()
    password = data["password"]
    role = data["role"].strip().lower()
    phone = (data.get("phone") or "").strip()

    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check duplicate email
        cursor.execute("SELECT user_id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            conn.close()
            return False, "An account with this email address already exists.", None

        pwd_hash, salt = hash_password(password)
        cursor.execute("""
            INSERT INTO users (name, email, phone, password_hash, salt, role, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (name, email, phone, pwd_hash, salt, role))
        user_id = cursor.lastrowid

        station_info = None
        # If Station Manager, create station record (pending verification per SRS FR-A2)
        if role == "manager":
            station_name = data.get("station_name", "").strip()
            station_address = data.get("station_address", "").strip()
            license_no = data.get("license_no", "").strip()
            lat = float(data.get("latitude") or 23.7500)
            lng = float(data.get("longitude") or 90.3800)

            cursor.execute("""
                INSERT INTO stations (manager_id, name, address, latitude, longitude, license_no, verification_status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            """, (user_id, station_name, station_address, lat, lng, license_no))
            station_id = cursor.lastrowid

            # Initialize tanks for Petrol, Octane, Diesel with initial 10,000L capacity
            cursor.execute("SELECT grade_id, name FROM fuel_grades")
            grades = cursor.fetchall()
            for g in grades:
                cursor.execute("""
                    INSERT INTO inventory (station_id, grade_id, current_litres, reserved_litres, capacity_litres, updated_by)
                    VALUES (?, ?, 0, 0, 10000, ?)
                """, (station_id, g["grade_id"], user_id))
                cursor.execute("""
                    INSERT INTO inventory_logs (station_id, grade_id, litres, action, recorded_by)
                    VALUES (?, ?, 0, 'INITIAL_SETUP', ?)
                """, (station_id, g["grade_id"], user_id))

            station_info = {"station_id": station_id, "name": station_name, "status": "pending"}

        conn.commit()
        return True, "Registration successful!", {
            "user_id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "station": station_info
        }
    except Exception as e:
        conn.rollback()
        return False, f"Registration failed: {str(e)}", None
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> tuple[bool, str, dict | None]:
    """Authenticates user against database with password hash verification."""
    if not email or not password:
        return False, "Email and password are required.", None

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, name, email, phone, password_hash, salt, role, status
        FROM users WHERE email = ?
    """, (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return False, "Invalid email or password.", None

    if row["status"] != "active":
        return False, "Account is disabled. Please contact system administrator.", None

    if not verify_password(row["password_hash"], row["salt"], password):
        return False, "Invalid email or password.", None

    token = create_access_token(row["user_id"], row["email"], row["role"], row["name"])
    user_payload = {
        "user_id": row["user_id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "token": token
    }
    return True, "Login successful", user_payload
