````markdown
# 📱 Real-Time Biometric & Geospatial Mobile Attendance System

[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20CORS%20%7C%20Bcrypt-orange?style=flat-square)](#)

A full-stack **mobile attendance system** designed to ensure high-integrity check-ins in academic and organizational environments.  
It combines **device binding**, **geolocation verification**, and **biometric selfie validation** to prevent proxy attendance and unauthorized access.

---

## 🚀 Key Features

- **Device Binding (Anti-Proxy Protection):** Each user is tied to a unique device ID to prevent account sharing.
- **Geofenced Attendance Verification:** Uses geolocation distance validation to ensure users are physically within allowed range.
- **Biometric Selfie Capture:** Requires image-based verification before marking attendance.
- **Session-Based Attendance Control:** Lecturers can open and close attendance windows in real time.
- **Automated Timestamping:** PostgreSQL handles secure and consistent time logging (Africa/Nairobi timezone support).
- **Mobile-Friendly Backend:** Supports local network deployment with dynamic IP detection for Android devices.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** PostgreSQL (`pg`)  
- **Geolocation:** Geolib  
- **Security:** JWT, Bcrypt, CORS  

---

## 📂 API Overview

```text
POST /api/login                     → User authentication + device validation
POST /api/lecturer/toggle-session  → Start/stop attendance session
GET  /api/class-status/:classId     → Check active session status
POST /api/attendance                → Submit attendance (location + selfie + validation)
GET  /api/attendance/status/:id     → Prevent duplicate daily submissions
GET  /api/lecturer/report/:id       → Generate attendance report
````

---

## ⚙️ Setup & Installation

### 1. Database Setup

Run the following SQL commands in PostgreSQL:

```sql
-- Set timezone
ALTER DATABASE students_attendance SET timezone TO 'Africa/Nairobi';

-- Default timestamps
ALTER TABLE attendance 
ALTER COLUMN attendance_date SET DEFAULT CURRENT_DATE;

ALTER TABLE attendance 
ALTER COLUMN sign_in_time SET DEFAULT CURRENT_TIMESTAMP;

-- Optional: clear test data
TRUNCATE TABLE attendance;
```

---

### 2. Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/students_attendance
```

---

### 3. Run the Project

```bash
# Clone repository
git clone https://github.com/your-username/repository-name.git

# Move into project directory
cd repository-name

# Install dependencies
npm install

# Start server
node server.js
```

---

## 📡 Deployment Notes

When started, the backend automatically detects your local network IP (e.g. `http://192.168.x.x:3000`) allowing seamless access from mobile devices on the same network.

---

## 📌 Future Improvements

* Face recognition model integration (instead of static selfie validation)
* Admin dashboard for analytics
* Offline attendance sync support
* Role-based access control improvements

---

## 📄 License

This project is open-source and available under the MIT License.

```
