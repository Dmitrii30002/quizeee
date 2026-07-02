const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Executed query in ${duration}ms: ${text.split('\n')[0]}`);
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
}

module.exports = {
  query,
  pool,
};
