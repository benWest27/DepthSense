const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'paraviz',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL Database'); // Debugging log
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL Connection Error:', err); // Debugging log
  process.exit(1);
});

module.exports = pool;
