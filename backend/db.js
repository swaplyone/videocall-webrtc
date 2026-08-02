import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: (process.env.DATABASE_URL.includes('render.com') || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'swaply',
      password: String(process.env.PGPASSWORD || 'postgres'),
      port: parseInt(process.env.PGPORT || '5432', 10)
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

/**
 * Execute a parameterized query. Protects against SQL Injection.
 * 
 * @param {string} text SQL Query string
 * @param {Array} params Query parameter values
 * @returns {Promise<object>} Query result
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`[Slow Query Alert] Query took ${duration}ms: ${text}`);
    }
    return res;
  } catch (err) {
    throw err;
  }
};

export default pool;
