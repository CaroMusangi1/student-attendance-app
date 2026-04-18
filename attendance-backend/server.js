require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDistance } = require('geolib');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// GLOBAL LOGGER
app.use((req, res, next) => {
    console.log(`\n[${new Date().toLocaleTimeString()}] ${req.method} to ${req.url}`);
    if (req.method === 'POST') console.log("Payload:", req.body);
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
            console.log(`❌ User "${email}" not found`);
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = userQuery.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // --- DEVICE ID CHECK (Students Only) ---
        if (role === 'student') {
            if (user.device_id && user.device_id !== deviceId) {
                console.log("❌ Device Lock Violation");
                return res.status(403).json({ error: "Your account is locked to another device." });
            }

            if (!user.device_id) {
                try {
                    await pool.query('UPDATE students SET device_id = $1 WHERE student_id = $2', [deviceId, user.student_id]);
                    console.log("✅ Device ID paired successfully.");
                } catch (dbErr) {
                    if (dbErr.code === '23505') {
                        return res.status(403).json({ 
                            error: "Device Error: This phone is already registered to another student." 
                        });
                    }
                    throw dbErr;
                }
            }
        }

        // --- FINAL SUCCESS RESPONSE ---
        console.log(`✅ Login successful: ${user.name}`);
        res.status(200).json({
            message: "Login successful",
            userId: user[idColumn],
            name: user.name,
            role: role
        });

    } catch (err) {
        console.error("🔥 Global Login Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}); // <--- THIS BRACKET WAS MISSING

// --- ATTENDANCE ROUTE ---
app.post('/api/attendance', async (req, res) => {
    const { studentId, classId, lat, long } = req.body;
    try {
        const classRes = await pool.query('SELECT * FROM classes WHERE class_id = $1', [classId]);
        if (classRes.rows.length === 0) return res.status(404).json({ error: "Class not found." });

        const classroom = classRes.rows[0];
        const distance = getDistance(
            { latitude: lat, longitude: long },
            { latitude: parseFloat(classroom.classroom_lat), longitude: parseFloat(classroom.classroom_long) }
        );

        if (distance <= classroom.radius_meters) {
            await pool.query(
                'INSERT INTO attendance (student_id, class_id, sign_in_time) VALUES ($1, $2, CURRENT_TIMESTAMP)', 
                [studentId, classId]
            );
            return res.status(200).json({ message: "Attendance marked successfully!", distance: `${distance}m` });
        } else {
            return res.status(403).json({ error: `Access Denied: You are ${distance}m away.` });
        }
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Already signed in today." });
        res.status(500).json({ error: "Database error" });
    }
});

// --- UTILITY ROUTES ---
app.get('/api/class/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM classes WHERE class_id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Class not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/attendance/status/:studentId/:classId', async (req, res) => {
    const { studentId, classId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM attendance WHERE student_id = $1 AND class_id = $2 AND sign_in_time::date = CURRENT_DATE',
            [studentId, classId]
        );
        res.json({ exists: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: "Status check failed" });
    }
});

app.get('/api/lecturer/report/:lecturerId', async (req, res) => {
    const { lecturerId } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                a.log_id AS attendance_id, 
                COALESCE(s.name, 'Unknown Student') AS student_name, 
                COALESCE(c.class_name, 'Unknown Class') AS class_name, 
                TO_CHAR(a.sign_in_time, 'HH24:MI:SS') AS time, 
                TO_CHAR(a.attendance_date, 'DD-MM-YYYY') AS date
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.student_id
            LEFT JOIN classes c ON a.class_id = c.class_id
            WHERE c.lecturer_id = $1
            ORDER BY a.sign_in_time DESC
        `, [lecturerId]);
        
        console.log(`📊 Success! Found ${result.rows.length} records for Lecturer ${lecturerId}`);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("🔥 SQL Error:", err.message);
        res.status(500).json({ error: "Database query failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://192.168.0.101:${PORT}`);
});