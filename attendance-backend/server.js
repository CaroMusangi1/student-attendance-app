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
app.use(express.json({ limit: '10mb' })); // Allows for large selfie strings if the student chooses to take one

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/student_attendance',
});

// Database Connection Check
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Database connection error:', err.stack);
    }
    console.log('✅ Database connected successfully!');
    release();
});

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { email, password, deviceId } = req.body;
    
    try {
        const cleanedEmail = email?.trim().toLowerCase();
        const userRes = await pool.query('SELECT * FROM students WHERE email = $1', [cleanedEmail]);
        const user = userRes.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            // Device ID Lock Logic
            if (user.device_id && user.device_id !== deviceId) {
                return res.status(403).json({ error: "Device mismatch. Use registered phone." });
            }
            
            if (!user.device_id) {
                await pool.query('UPDATE students SET device_id = $1 WHERE student_id = $2', [deviceId, user.student_id]);
            }

            const token = jwt.sign(
                { id: user.student_id }, 
                process.env.JWT_SECRET || 'secret123', 
                { expiresIn: '1h' }
            );

            return res.status(200).json({ 
                token, 
                studentId: user.student_id,
                name: user.name 
            });
        } else {
            return res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        console.error("🔥 Login Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// --- ATTENDANCE ROUTE (GPS Mandatory, Selfie Optional) ---
app.post('/api/attendance', async (req, res) => {
    const { studentId, classId, lat, long, photoUri } = req.body;
    
    try {
        // 1. Get Class Location & Radius
        const classRes = await pool.query('SELECT * FROM classes WHERE class_id = $1', [classId]);
        if (classRes.rows.length === 0) return res.status(404).json({ error: "Class not found." });

        const classroom = classRes.rows[0];
        
        // 2. Calculate Distance
        const distance = getDistance(
            { latitude: lat, longitude: long },
            { latitude: parseFloat(classroom.classroom_lat), longitude: parseFloat(classroom.classroom_long) }
        );

        // 3. Geofence Validation (The "Only" Requirement)
        if (distance <= classroom.radius_meters) {
            
            // 4. Save to Database
            // This will work regardless of whether photoUri is provided or null
            await pool.query(
                'INSERT INTO attendance (student_id, class_id, sign_in_time) VALUES ($1, $2, CURRENT_TIMESTAMP)', 
                [studentId, classId]
            );

            return res.status(200).json({ 
                message: "Attendance marked successfully!", 
                distance: `${distance}m` 
            });

        } else {
            // If they are outside the radius, show the error with exact meters
            return res.status(403).json({ 
                error: `Access Denied: You are ${distance}m away. You must be within ${classroom.radius_meters}m of the classroom.` 
            });
        }

    } catch (err) {
        // Handle Duplicate Entry (Student trying to sign in twice same day)
        if (err.code === '23505') {
            return res.status(400).json({ error: "You have already signed in for this class today." });
        }
        console.error("🔥 Attendance Error:", err);
        res.status(500).json({ error: "Database error while saving attendance." });
    }
});

// --- GET CLASS DETAILS ---
app.get('/api/class/:id', async (req, res) => {
    try {
        const classId = req.params.id;
        const result = await pool.query('SELECT * FROM classes WHERE class_id = $1', [classId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Class not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("🔥 Class Fetch Error:", err);
        res.status(500).json({ error: "Server error fetching class" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://192.168.0.101:${PORT}`);
});