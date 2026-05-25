require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.PG_URI,
    ssl: {
        rejectUnauthorized: false
    },
    // Neon Recommended Settings
    max: 10,                    // Max connections
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Timeout after 10s
});

// Graceful handling of connection errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Do not exit process in development
});

const connectToDb = async () => {
    try {
        const client = await pool.connect();
        client.release();
        console.log('✅ Successfully connected to Neon Database');
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        throw err;
    }
};

module.exports = { pool, connectToDb };