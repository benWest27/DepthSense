const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'depthsense',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

// Ensure the table exists
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS datasets (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      value FLOAT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    logger.info('✅ Datasets table is ready.');
  } catch (error) {
    logger.error('❌ Failed to initialize datasets table:', error);
  }
};

// Insert Data
const insertDataset = async (name, value) => {
  try {
    const result = await pool.query(
      'INSERT INTO datasets (name, value) VALUES ($1, $2) RETURNING *',
      [name, value]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Error inserting dataset:', error);
    throw error;
  }
};

// Get All Datasets
const getAllDatasets = async () => {
  try {
    const result = await pool.query('SELECT * FROM datasets ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    logger.error('❌ Error fetching datasets:', error);
    throw error;
  }
};

// Get Dataset by ID
const getDatasetById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Error fetching dataset with ID ${id}:`, error);
    throw error;
  }
};

// Update Dataset
const updateDataset = async (id, name, value) => {
  try {
    const result = await pool.query(
      'UPDATE datasets SET name = $1, value = $2 WHERE id = $3 RETURNING *',
      [name, value, id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Error updating dataset with ID ${id}:`, error);
    throw error;
  }
};

// Delete Dataset
const deleteDataset = async (id) => {
  try {
    await pool.query('DELETE FROM datasets WHERE id = $1', [id]);
    return { message: `Dataset with ID ${id} deleted.` };
  } catch (error) {
    logger.error(`❌ Error deleting dataset with ID ${id}:`, error);
    throw error;
  }
};

// Initialize Table on Startup
createTable();

module.exports = {
  insertDataset,
  getAllDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
};
