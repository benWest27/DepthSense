const { Pool } = require('pg');

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

const config = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'paraviz',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
};

let pool;

async function createPoolWithRetry(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = new Pool(config);
      await pool.query('SELECT 1'); // test the connection
      console.log('✅ Connected to PostgreSQL Database');
      break;
    } catch (err) {
      console.error(`⏳ Attempt ${attempt} failed to connect to DB:`, err.message);
      if (attempt === retries) {
        console.error('❌ PostgreSQL Connection failed after maximum retries.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL Connection Error:', err);
    process.exit(1);
  });

  return pool;
}

module.exports = createPoolWithRetry;
