# Student Attendance App

A mobile-first student attendance system built with an Expo React Native frontend and a Node.js/Express backend with PostgreSQL. The app supports role-based login for students and lecturers, location-aware attendance marking, selfie verification, session control, and lecturer reporting with CSV export.

## Overview

This project is split into two applications:

- `attendance-backend`: REST API, authentication, attendance validation, and report generation.
- `student-frontend`: Expo mobile app for students and lecturers.

The system is designed for classroom attendance workflows where a lecturer opens a session for a class, students sign in only while the session is active, and the backend validates proximity using GPS coordinates before recording attendance.

## Key Features

- Role-based login for students and lecturers.
- Lecturer-controlled attendance windows per class.
- Student attendance capture with GPS validation.
- Selfie-based verification before marking attendance.
- Device binding for student accounts to discourage account sharing.
- Lecturer attendance reporting with CSV export.
- Basic network diagnostic screen for local backend connectivity testing.

## Tech Stack

- Frontend: React Native, Expo, Expo Camera, Expo Location, Expo File System, Expo Sharing, Lucide icons.
- Backend: Node.js, Express, PostgreSQL, bcrypt, JSON Web Token, CORS, dotenv, geolib.

## Repository Structure

```text
student-attendance-app/
├── attendance-backend/
│   ├── init.sql
│   ├── package.json
│   ├── seed.js
│   └── server.js
├── student-frontend/
│   ├── App.js
│   ├── NetworkTest.js
│   ├── app.json
│   ├── index.js
│   ├── package.json
│   └── src/
│       └── screens/
│           ├── AttendanceScreen.js
│           ├── LecturerDashboard.js
│           └── LoginScreen.js
└── README.md
```

## How It Works

1. A user logs in as either a student or lecturer.
2. The backend validates the email and password against PostgreSQL.
3. Students are locked to the first device they use for login.
4. Lecturers can start or stop an attendance session for a class.
5. Students can only sign in while the session is active.
6. The app checks the student location against the classroom coordinates stored in the database.
7. A selfie is required before the backend accepts the attendance submission.
8. Lecturers can view attendance history and export it as CSV.

## Prerequisites

- Node.js 18+.
- PostgreSQL 14+.
- Expo Go on a physical Android or iOS device, or an Expo-compatible simulator/emulator.
- A shared Wi-Fi network between your development machine and mobile device if you test on a physical device.

## Backend Setup

1. Open a terminal in `attendance-backend`.
2. Install dependencies:

```bash
npm install
```

3. Create a PostgreSQL database and make sure the schema exists before starting the server.

The backend expects these tables:

- `students`
- `lecturers`
- `classes`
- `attendance`

4. Set your environment variables.

Create a `.env` file in `attendance-backend`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/students_attendance
JWT_SECRET=your_secret_key_here
```

5. Start the API server:

```bash
node server.js
```

## Database Notes

- `server.js` defaults to `students_attendance` if `DATABASE_URL` is not provided.
- `seed.js` currently points to `student_attendance` in its fallback connection string.
- Use one database name consistently in your `.env` to avoid connection issues.
- `seed.js` updates all student and lecturer password hashes to the demo password `password123`.

If you are preparing a production or portfolio-ready deployment, replace the demo password seeding flow with a proper user management process.

## Frontend Setup

1. Open a terminal in `student-frontend`.
2. Install dependencies:

```bash
npm install
```

3. Start the Expo app:

```bash
npm start
```

4. Use the Expo QR code in Expo Go, or launch on Android, iOS, or web from the Expo CLI.

## Important Configuration

The frontend currently uses a hardcoded backend URL:

- `student-frontend/src/screens/LoginScreen.js`
- `student-frontend/src/screens/AttendanceScreen.js`
- `student-frontend/src/screens/LecturerDashboard.js`
- `student-frontend/NetworkTest.js`

Update the `SERVER_URL` or login endpoint values to match your machine or server IP address before testing on a real device. The Expo app and backend must be reachable from the same network for local development.

## Usage Guide

### Student Flow

1. Open the app and select the Student role.
2. Sign in with a valid student email and password.
3. Allow location access when prompted.
4. Select the target class.
5. Wait for the lecturer to start the attendance session.
6. Capture a selfie and mark attendance.

### Lecturer Flow

1. Open the app and select the Lecturer role.
2. Sign in with a lecturer account.
3. Review the attendance report.
4. Start or stop the attendance session for the configured class.
5. Refresh the report or export it as CSV.

## API Endpoints

### Authentication

- `POST /api/login`

Request body:

```json
{
  "email": "name@example.com",
  "password": "password123",
  "role": "student",
  "deviceId": "device-identifier"
}
```

### Session Control

- `POST /api/lecturer/toggle-session`
- `GET /api/class-status/:classId`

### Attendance

- `POST /api/attendance`
- `GET /api/attendance/status/:studentId/:classId`

### Reporting

- `GET /api/lecturer/report/:lecturerId`

## Security and Validation Notes

- Student accounts can be bound to a single device after the first login.
- Attendance is rejected if the session is closed.
- Attendance is rejected if the student is outside the configured classroom radius.
- Attendance is rejected if the selfie payload is missing or too short.
- The backend currently logs incoming requests for debugging and development visibility.

## Troubleshooting

- If the app shows connection errors, confirm the backend is running and the frontend `SERVER_URL` matches your machine IP.
- If login fails unexpectedly, verify the database has user rows and that password hashes were seeded correctly.
- If attendance is denied, check that the lecturer has started the session and that GPS permissions are enabled.
- If CSV export fails, make sure the Expo file system and sharing permissions are available on the device.

## Recommended Production Improvements

- Move hardcoded server URLs into environment-based configuration.
- Add backend npm scripts for `start` and `seed`.
- Add a proper SQL migration or schema file for `init.sql`.
- Centralize class selection so both frontend and backend derive class data from the database.
- Add a real JWT issuance flow if authenticated sessions are required beyond the current demo login response.

## License
- MIT Licence