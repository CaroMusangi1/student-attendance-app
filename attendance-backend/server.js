require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDistance } = require('geolib');
const os = require('os');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// GLOBAL LOGGER
app.use((req, res, next) => {
    console.log(`\n[${new Date().toLocaleTimeString()}] ${req.method} to ${req.url}`);
    if (req.method === 'POST' && req.url !== '/api/attendance') {
        console.log("Payload:", req.body);
    } else if (req.url === '/api/attendance') {
        console.log("Payload: [Attendance Data Received]");
    }
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/student_attendance',
});

// Database Connection Check
pool.connect((err, client, release) => {
    if (err) return console.error('❌ Database connection error:', err.stack);
    console.log('✅ Database connected successfully!');
    release();
});

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const email = req.body.email ? req.body.email.toLowerCase().trim() : '';
    const { password, role, deviceId } = req.body;

    try {
        let tableName = role === 'student' ? 'students' : 'lecturers';
        let idColumn = role === 'student' ? 'student_id' : 'lecturer_id';

        const userQuery = await pool.query(`SELECT * FROM ${tableName} WHERE email = $1`, [email]);

        if (userQuery.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = userQuery.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (role === 'student') {
            if (user.device_id && user.device_id !== deviceId) {
                return res.status(403).json({ error: "Account locked to another device." });
            }
            if (!user.device_id) {
                await pool.query('UPDATE students SET device_id = $1 WHERE student_id = $2', [deviceId, user.student_id]);
            }
        }

        res.status(200).json({
            message: "Login successful",
            userId: user[idColumn],
            name: user.name,
            role: role
        });

    } catch (err) {
        console.error("🔥 Login Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- SESSION CONTROL ROUTES (UPDATED FOR SINGLE SESSION RULE) ---
app.post('/api/lecturer/toggle-session', async (req, res) => {
    const { classId, status } = req.body;
    try {
        if (status === true) {
            // STEP 1: Turn OFF all other sessions first (Demo Rule)
            await pool.query('UPDATE classes SET is_active = false');
            
            // STEP 2: Turn ON only the selected session
            await pool.query('UPDATE classes SET is_active = true WHERE class_id = $1', [classId]);
            console.log(`📡 Clean Start: Class ${classId} is now the ONLY active session.`);
        } else {
            // Simply turn off the selected session
            await pool.query('UPDATE classes SET is_active = false WHERE class_id = $1', [classId]);
            console.log(`📡 Session for Class ${classId} ended.`);
        }
        
        res.status(200).json({ message: `Session ${status ? 'started' : 'ended'} successfully.` });
    } catch (err) {
        console.error("🔥 Toggle Error:", err.message);
        res.status(500).json({ error: "Failed to toggle session status" });
    }
});

app.get('/api/class-status/:classId', async (req, res) => {
    try {
        const result = await pool.query('SELECT is_active FROM classes WHERE class_id = $1', [req.params.classId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Class not found" });
        res.json({ isActive: result.rows[0].is_active });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- ATTENDANCE ROUTE ---
app.post('/api/attendance', async (req, res) => {
    const { studentId, classId, lat, long, photoUri } = req.body;
    
    try {
        const sID = parseInt(studentId);
        const cID = parseInt(classId);

        const classRes = await pool.query('SELECT * FROM classes WHERE class_id = $1', [cID]);
        if (classRes.rows.length === 0) {
            return res.status(404).json({ error: "Class not found." });
        }

        const classroom = classRes.rows[0];

        // Ensure session is actually active
        if (!classroom.is_active) {
            return res.status(403).json({ error: "Attendance window closed: Session not active." });
        }

        // Geofencing Check
        const distance = getDistance(
            { latitude: lat, longitude: long },
            { latitude: parseFloat(classroom.classroom_lat), longitude: parseFloat(classroom.classroom_long) }
        );

        if (distance <= classroom.radius_meters) {
            await pool.query(
                `INSERT INTO attendance 
                (student_id, class_id, lat, long, photo_url, status, sign_in_time, attendance_date) 
                VALUES ($1, $2, $3, $4, $5, 'Present', NOW(), CURRENT_DATE)`, 
                [sID, cID, lat || 0, long || 0, photoUri || 'no-photo']
            );
            console.log(`✅ Attendance marked for student ${sID} in class ${cID}`);
            return res.status(200).json({ message: "Attendance marked!", distance: `${distance}m` });
        } else {
            return res.status(403).json({ error: `Too far from classroom (${distance}m away).` });
        }
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "You have already signed in today." });
        }
        console.error("🔥 DB Error:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

// --- UTILITY ROUTES ---
app.get('/api/attendance/status/:studentId/:classId', async (req, res) => {
    const { studentId, classId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM attendance WHERE student_id = $1 AND class_id = $2 AND attendance_date = CURRENT_DATE',
            [parseInt(studentId), parseInt(classId)]
        );
        res.json({ exists: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: "Status check failed" });
    }
});

app.get('/api/lecturer/report/:lecturerId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.log_id, s.name as student_name, c.class_name, 
            TO_CHAR(a.sign_in_time, 'HH24:MI:SS') as time, 
            TO_CHAR(a.attendance_date, 'DD-MM-YYYY') as date
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.student_id
            LEFT JOIN classes c ON a.class_id = c.class_id
            WHERE c.lecturer_id = $1
            ORDER BY a.sign_in_time DESC
        `, [req.params.lecturerId]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Report failed" });
    }
});

// --- DYNAMIC IP DETECTION ---
const getLocalExternalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('-------------------------------------------');
    console.log(`🚀 Attendance Server Live on Port ${PORT}`);
    console.log('-------------------------------------------');
});