require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.PG_URI,
    ssl: {
        rejectUnauthorized: false
    }
});

const connectToDb = async () => {
    try {
        await pool.connect();
        console.log('✅ Successfully connected to Neon Database');
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        throw err;
    }
};

module.exports = { pool, connectToDb };