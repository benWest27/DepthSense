const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:password@postgres:5432/depthsense'
});

module.exports = { pool };
