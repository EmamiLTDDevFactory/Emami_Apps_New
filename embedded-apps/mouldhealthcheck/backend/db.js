const { Pool } = require('pg');

/*
   POSTGRES CONNECTION POOL — Development Environment DB.
   Credentials come from environment variables (backend/.env, gitignored — see .env.example
   for the shape). Never hardcode real credentials here.
*/
const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('[postgres] Unexpected error on idle client:', err.message);
});

/** One-off connectivity check — logs success/failure, doesn't throw (used at server startup). */
async function testConnection() {
    try {
        const client = await pool.connect();
        try {
            const { rows } = await client.query('SELECT NOW() AS now, current_database() AS db');
            console.log(`[postgres] Connected to "${rows[0].db}" at ${rows[0].now}`);
            return true;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[postgres] Connection failed:', err.message);
        return false;
    }
}

module.exports = { pool, testConnection };
