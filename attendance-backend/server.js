require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDistance } = require('geolib');

const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

//to verify the DB is actually reachable
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Database connection error:', err.stack);
  }
  console.log('✅ Database connected successfully!');
  release();
});
//Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'Connected', 
        timestamp: new Date().toLocaleString() 
    });
});
// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
    const { email, password, deviceId } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
        const user = userRes.rows[0];

        if (user && await bcrypt.compare(password, user.password_hash)) {
            // Check Device ID for proxy prevention [cite: 4]
            if (user.device_id && user.device_id !== deviceId) {
                return res.status(403).json({ error: "Device mismatch. Proxy sign-in blocked." });
            }
            if (!user.device_id) {
                await pool.query('UPDATE students SET device_id = $1 WHERE student_id = $2', [deviceId, user.student_id]);
            }

            const token = jwt.sign({ id: user.student_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, studentId: user.student_id });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error during login" });
    }
});

// --- GPS ATTENDANCE LOGGING ---
app.post('/api/attendance', async (req, res) => {
    const { studentId, classId, lat, long } = req.body;

    try {
        // 1. Get Class Location
        const classRes = await pool.query('SELECT * FROM classes WHERE class_id = $1', [classId]);
        const classroom = classRes.rows[0];

        // 2. Geofence Calculation [cite: 3, 16]
        const distance = getDistance(
            { latitude: lat, longitude: long },
            { latitude: parseFloat(classroom.classroom_lat), longitude: parseFloat(classroom.classroom_long) }
        );

        if (distance <= classroom.radius_meters) {
            await pool.query('INSERT INTO attendance (student_id, class_id) VALUES ($1, $2)', [studentId, classId]);
            res.json({ message: "Attendance marked successfully!" });
        } else {
            res.status(403).json({ error: `You are too far (${distance}m away).` });
        }
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Already signed in today." });
        res.status(500).json({ error: "Database error." });
    }
});

// --- ANALYTICS REPORTS ---
app.get('/api/reports/:classId', async (req, res) => {
    try {
        const report = await pool.query(
            `SELECT s.name, a.sign_in_time FROM attendance a 
             JOIN students s ON a.student_id = s.student_id 
             WHERE a.class_id = $1`, [req.params.classId]
        );
        res.json(report.rows);
    } catch (err) {
        res.status(500).json({ error: "Could not generate report." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));