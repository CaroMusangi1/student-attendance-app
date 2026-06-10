```markdown
# Real-Time Biometric & Geospatial Mobile Attendance System

[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![CORS](https://img.shields.io/badge/Security-CORS-FF6B6B?style=flat-square)](#)

A secure, high-integrity full-stack **Biometric Mobile Attendance and Session Control System** engineered to eliminate proxy attendance in academic and corporate environments. The system enforces strict physical and hardware compliance by combining real-time cryptographic device-locking, geospatial geofencing, and mandatory biometric selfie verification.

---

## 🚀 Key Features

* **Anti-Proxy Device Locking:** Restricts student authentication to a single recorded hardware `deviceId`, preventing account sharing.
* **Geofenced Verification:** Utilizes `geolib` to compute the exact distance between the mobile client and the classroom coordinates, rejecting signatures outside the allowed radius.
* **Biometric Selfie Verification:** Mandates high-resolution base64 photo payloads to validate physical presence before database insertion.
* **Dynamic Session Control:** Allows instructors to broadcast and toggle active attendance windows globally across the infrastructure.
* **Automated Temporal Logging:** Offloads timestamp generation entirely to PostgreSQL tracking mechanisms synced to local time zones (`Africa/Nairobi`).
* **Resilient Mobile Backend Architecture:** Configured with dynamic local IPv4 interface parsing to support seamless local hosting over hot-spots or localized WLANs.

---

## 🛠️ Tech Stack

* **Runtime Environment:** Node.js
* **Backend Framework:** Express.js
* **Database Engine:** PostgreSQL (pg)
* **Geospatial Processing:** Geolib
* **Cryptography & Security:** Bcrypt, CORS, JSON Web Tokens (JWT)

---

## 📂 System Architecture & API Endpoints

```text
POST /api/login                     # Authenticates users & enforces anti-sharing device locks
POST /api/lecturer/toggle-session   # Activates/Terminates live attendance windows
GET  /api/class-status/:classId     # Client-side pooling for active session validation
POST /api/attendance                # Core engine: processes location, selfie, and signs attendance
GET  /api/attendance/status/...     # Prevents duplicate entries per student/class for the current date
GET  /api/lecturer/report/:id       # Aggregates structured real-time attendance logs via SQL Joins

```

---

## ⚙️ Setup & Installation

### 1. Database Configuration

Execute the following schema preparation queries inside your PostgreSQL query editor to establish constraints, handles, and automatic temporal properties:

```sql
-- Set local server timezone environment
ALTER DATABASE students_attendance SET timezone TO 'Africa/Nairobi';

-- Configure self-generating schema defaults
ALTER TABLE attendance ALTER COLUMN attendance_date SET DEFAULT CURRENT_DATE;
ALTER TABLE attendance ALTER COLUMN sign_in_time SET DEFAULT CURRENT_TIMESTAMP;

-- Clear testing artifacts if necessary
TRUNCATE TABLE attendance;

```

### 2. Environment Variables

Create a `.env` file in the root directory of the server application:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/students_attendance

```

### 3. Installation & Deployment

```bash
# Clone the repository
git clone [https://github.com/your-username/repository-name.git](https://github.com/your-username/repository-name.git)

# Navigate into the project root directory
cd repository-name

# Install backend dependencies
npm install

# Initialize the server instance
node server.js

```

Upon initialization, the backend engine will automatically scan system interfaces and broadcast the dynamic local network URL (e.g., `http://192.168.X.X:3000`), making it instantly available for connection by local Android devices.

```

```
