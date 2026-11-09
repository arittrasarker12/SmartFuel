# AI-Based SmartFuel System ⛽
**Department of SWE • Daffodil International University (DIU)**  
**Course:** SE331 Software Engineering Design Capstone Project (Fall 2026)  
**Group:** JESTER (Group 07)  
**Lead & Devs:** Arittra Sarker (241-35-456), Nur E Ava Tasnim (241-35-345), Kaniz Fatema Koli (241-35-571)  
**Course Teacher:** Rahat Uddin Azad, Lecturer  

---

## 📌 Project Architecture
SmartFuel follows an industry-standard modern decoupled architecture matching the approved SRS document:
- **`backend/`**: Python FastAPI REST API with SQLite database, secure salted PBKDF2 password hashing, and role-based permissions.
- **`frontend/`**: Modern React.js (Vite + Tailwind CSS) Single Page Application (SPA) with modular components for Customer, Station Manager, and Admin roles.

```
smartfuel/
├── backend/
│   ├── auth.py              # Salted PBKDF2 hashing, JWT generation & verification, validation
│   ├── crud.py              # Business logic: Inventory update, Sales recording, Customer stock, Admin
│   ├── database.py          # SQLite schema according to SRS data dictionary
│   ├── models.py            # Pydantic request models with field validation
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Header navigation & role switcher
│   │   │   ├── CustomerView.jsx      # Feature 3: Live fuel availability & system stock summary
│   │   │   ├── ManagerDashboard.jsx  # Feature 1 (inventory update) & Feature 2 (sales recording)
│   │   │   ├── AdminPanel.jsx        # Admin station approvals & official price management
│   │   │   └── AuthModal.jsx         # Registration & Login with 1-click evaluation switcher
│   │   ├── api.js           # API client with auto-injected JWT authorization headers
│   │   ├── App.jsx          # Main application router and state
│   │   ├── index.css        # Tailwind CSS
│   │   └── main.jsx         # React bootstrap entry point
│   ├── package.json         # React dependencies (vite, react, tailwind)
│   └── vite.config.js       # Vite server with /api proxy to FastAPI
├── main.py                  # Backend server launcher
├── seed.py                  # Auto-seeds demo stations, users, prices, inventory, and sales
├── smartfuel.db             # Pre-populated SQLite database
├── run_backend.bat          # 1-click backend runner
├── run_frontend.bat         # 1-click frontend runner
├── run_all.bat              # 1-click launch BOTH backend and frontend
└── README.md
```

---

## 🚀 Key Features Implemented (Matching SRS & Guidelines)

### A. Authentication Module (Compulsory)
- **User Registration**: Register as **Customer** or **Station Manager** (with station trade license & address fields).
- **Secure Password Handling**: Passwords are never stored in plaintext and there are **no hardcoded credentials**. Passwords are encrypted using **PBKDF2-HMAC-SHA256** with 100,000 iterations and unique cryptographically secure 16-byte random salts. Verification uses constant-time string comparison (`secrets.compare_digest`).
- **Session Management**: Session tokens are cryptographically signed with 30-minute expiration matching SRS **NFR-S5**.
- **Proper Input Validation**: Email regex formatting, minimum password length & alphanumeric enforcement, role verification, and required field checks.

### B. Three Core Functional Requirements
1. **Feature 1: Update Fuel Inventory (Station Manager)** *(SRS FR-S1, FR-S3, Table 7.4)*
   - Managers update current available litres for Petrol, Octane, and Diesel.
   - **Input Validation**: Rejects negative values, non-numeric values, and stock values exceeding tank capacity (e.g. 10,000 L).
   - Generates timestamped audit records in the `inventory_logs` table.
   - Changes reflect immediately on customer-facing views.

2. **Feature 2: Record Fuel Sales (Station Manager)** *(SRS FR-S2, FR-S3, Table 7.4)*
   - Managers record litres sold during shifts.
   - **Input Validation**: Validates that litres sold is positive and **cannot exceed currently available stock**.
   - Automatically computes total revenue (BDT) using the official price.
   - Deducts sold litres from current inventory in `smartfuel.db` and logs the transaction into `sales_records` and `inventory_logs`.

3. **Feature 3: View Fuel Availability (Customer)** *(SRS FR-C1, FR-C2, FR-C6, FR-C7)*
   - Real-time station availability across verified Dhaka filling stations.
   - Dynamic status badges:
     - 🟢 **Available** (>20% capacity)
     - 🟡 **Low Stock** (≤20% capacity)
     - 🔴 **Out of Stock** (0 L)
     - 🟠 **Unreliable / Stale** (marked if data is older than 6 hours per SRS **FR-C2**).
   - **Today's Stock View (FR-C6)**: Displays litres available now, tank capacity, capacity percentage bar, official price, and last-updated relative time.
   - **System Stock Summary (FR-C7)**: City-wide totals of available litres and active stations per fuel grade.
   - **Filters & Search (FR-C3)**: Search stations by name or Dhaka location (e.g. Dhanmondi, Gulshan), and filter by fuel grade.

### C. Admin Management Side *(SRS FR-A2, FR-A3, FR-D1, FR-D2, FR-S5)*
- **Station Verification**: Review license numbers and toggle station status (**Verified** vs **Pending** / **Rejected**). Unverified stations remain completely hidden from customers per SRS **FR-A3**.
- **Official Fuel Prices**: Admin manages official BPC rates for Petrol, Octane, and Diesel. Prices are read-only for station managers and customers.
- **Platform Analytics**: Total users, registered stations, city-wide fuel stock, and total sales volume.

---

## 💻 How to Run in VS Code

### Option 1: 1-Click Launch (Easiest)
Simply double-click [`run_all.bat`](file:///C:/Users/PC/.gemini/antigravity/scratch/smartfuel/run_all.bat) or run:
```cmd
.\run_all.bat
```
This automatically launches:
- **Backend API**: `http://127.0.0.1:8000`
- **Frontend App**: `http://127.0.0.1:5173`

---

### Option 2: Running via VS Code Terminals

#### Terminal 1: Run Backend
1. Open a terminal in VS Code (`Ctrl + ` `).
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the backend:
   ```bash
   python main.py
   ```
*(Backend runs at `http://127.0.0.1:8000`)*

#### Terminal 2: Run Frontend
1. Open a second terminal tab (`+` icon in terminal).
2. Navigate to frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
*(Frontend runs at `http://127.0.0.1:5173`)*

---

## 🔑 Demo Login Accounts (1-Click Switcher Available in UI)

For quick evaluation, click the **"1-Click Quick Demo Switcher"** on the Sign In modal, or enter these credentials:

| Role | Email | Password | Assigned Station / Notes |
|---|---|---|---|
| **Admin** | `admin@smartfuel.com` | `Admin@123` | Platform Administrator (Reviews licenses, sets fuel prices) |
| **Station Manager** | `manager@dhakaoil.com` | `Manager@123` | Padma Oil Model Station - Dhanmondi (Verified) |
| **Station Manager 2** | `manager2@gulshan.com` | `Manager@123` | Meghna Petroleum - Gulshan 2 (Demonstrates Low & Out badges) |
| **Station Manager 3** | `manager3@mirpur.com` | `Manager@123` | Jamuna Oil - Mirpur 10 (Pending verification for Admin test) |
| **Customer** | `customer@gmail.com` | `Customer@123` | End-user / Vehicle Owner |
