require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/student_attendance',
});

async function seedPasswords() {
    const password = 'password123'; // The universal password for your demo
    try {
        console.log("Generating fresh hash...");
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        console.log(`Generated Hash: ${hash}`);
        console.log(`Hash Length: ${hash.length}`);

        // Update Students
        console.log("Updating all students...");
        await pool.query('UPDATE students SET password_hash = $1', [hash]);

        // Update Lecturers
        console.log("Updating all lecturers...");
        await pool.query('UPDATE lecturers SET password_hash = $1', [hash]);

        console.log("✅ Database successfully seeded with fresh hashes!");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    } finally {
        await pool.end();
    }
}

seedPasswords();