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

// --- DATABASE CONNECTION ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/students_attendance',
});

// Setting the timezone session-wide upon connection
pool.on('connect', (client) => {
    client.query("SET timezone = 'Africa/Nairobi'");
});

pool.connect((err, client, release) => {
    if (err) return console.error('❌ Database connection error:', err.stack);
    console.log('✅ Database connected successfully to students_attendance!');
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
                await pool.query(`UPDATE students SET device_id = $1 WHERE student_id = $2`, [deviceId, user.student_id]);
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

// --- SESSION CONTROL ROUTES ---
app.post('/api/lecturer/toggle-session', async (req, res) => {
    const { classId, status } = req.body;
    try {
        await pool.query('UPDATE classes SET is_active = false');
        if (status === true) {
            await pool.query('UPDATE classes SET is_active = true WHERE class_id = $1', [parseInt(classId)]);
            console.log(`📡 Session for Class ${classId} is now active.`);
        } else {
            console.log(`📡 All sessions ended.`);
        }
        res.status(200).json({ message: `Session updated successfully.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle session" });
    }
});

app.get('/api/class-status/:classId', async (req, res) => {
    try {
        const result = await pool.query('SELECT is_active FROM classes WHERE class_id = $1', [parseInt(req.params.classId)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Class not found", isActive: false });
        }
        res.json({ isActive: result.rows[0].is_active });
    } catch (err) {
        res.status(500).json({ error: "Server error", isActive: false });
    }
});

// --- ATTENDANCE ROUTE ---
app.post('/api/attendance', async (req, res) => {
    const { studentId, classId, lat, long, photoUri } = req.body;
    
    try {
        const sID = parseInt(studentId);
        const cID = parseInt(classId);

        const classRes = await pool.query('SELECT * FROM classes WHERE class_id = $1', [cID]);
        if (classRes.rows.length === 0) return res.status(404).json({ error: "Class not found." });

        const classroom = classRes.rows[0];

        if (!classroom.is_active) {
            return res.status(403).json({ error: "Attendance window closed." });
        }

        if (!photoUri || photoUri.length < 100) {
            return res.status(400).json({ error: "Selfie verification required." });
        }

        const distance = getDistance(
            { latitude: parseFloat(lat), longitude: parseFloat(long) },
            { latitude: parseFloat(classroom.classroom_lat), longitude: parseFloat(classroom.classroom_long) }
        );

        if (distance <= classroom.radius_meters) {
            // DB handles attendance_date and sign_in_time automatically via DEFAULT
            await pool.query(
                `INSERT INTO attendance 
                (student_id, class_id, lat, long, photo_url, status) 
                VALUES ($1, $2, $3, $4, $5, 'Present')`, 
                [sID, cID, lat || 0, long || 0, photoUri]
            );
            console.log(`✅ Attendance marked successfully for student ${sID}`);
            return res.status(200).json({ message: "Attendance marked!", distance: `${distance}m` });
        } else {
            return res.status(403).json({ error: `Too far (${distance}m away).` });
        }
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Already signed in today." });
        console.error("🔥 DB Error:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

// --- STATUS CHECK ---
app.get('/api/attendance/status/:studentId/:classId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM attendance 
             WHERE student_id = $1 AND class_id = $2 
             AND attendance_date = CURRENT_DATE`, 
            [parseInt(req.params.studentId), parseInt(req.params.classId)]
        );
        res.json({ exists: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: "Status check failed", exists: false });
    }
});

// --- REPORT ROUTE ---
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
            ORDER BY a.log_id DESC
        `, [parseInt(req.params.lecturerId)]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Report failed" });
    }
});

// --- JSON CATCH-ALL ---
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.url} not found.` });
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
const CURRENT_IP = getLocalExternalIP();

app.listen(PORT, '0.0.0.0', () => {
    console.log('-------------------------------------------');
    console.log(`🚀 Attendance Server Started!`);
    console.log(`🌐 URL: http://${CURRENT_IP}:${PORT}`);
    console.log('-------------------------------------------');
});