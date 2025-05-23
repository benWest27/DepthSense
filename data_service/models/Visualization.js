const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'paraviz',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

// Load SQL from migration script
const initializeDatabase = async () => {
  const initSQL = fs.readFileSync(path.join(__dirname, '../database/init.sql'), 'utf-8');
  try {
    await pool.query(initSQL);
    logger.info('✅ Database initialized successfully.');
  } catch (error) {
    logger.error('❌ Failed to initialize database:', error);
  }
};

// Run DB initialization
initializeDatabase();

// Error Handler for Queries
const handleError = (error, operation, id = null) => {
  logger.error(`❌ Error during ${operation}${id ? ` for ID ${id}` : ''}:`, {
    message: error.message,
    code: error.code,
    detail: error.detail || 'No additional details',
    table: 'visualizations',
  });
  throw error;
};

// Insert Visualization
const insertVisualization = async (title, description, data, createdBy = null) => {
  try {
    const result = await pool.query(
      'INSERT INTO visualizations (title, description, data, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, JSON.stringify(data), createdBy || null]
    );
    logger.info(`✅ Visualization inserted successfully with ID: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Failed to insert visualization:', error);
    handleError(error, 'insert visualization');
  }
};

// Get All Visualizations
const getAllVisualizations = async () => {
  try {
    const result = await pool.query('SELECT * FROM visualizations ORDER BY created_at DESC');
    logger.info(`✅ Fetched ${result.rows.length} visualizations successfully.`);
    return result.rows;
  } catch (error) {
    logger.error('❌ Failed to fetch all visualizations:', error);
    handleError(error, 'fetch all visualizations');
  }
};

// Get Visualization by ID
const getVisualizationById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM visualizations WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      logger.info(`✅ Fetched visualization successfully with ID: ${id}`);
    } else {
      logger.info(`ℹ️ No visualization found with ID: ${id}`);
    }
    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Failed to fetch visualization with ID: ${id}`);
    handleError(error, 'fetch visualization', id);
  }
};

// Update Visualization
const updateVisualization = async (id, title, description, data) => {
  try {
    const result = await pool.query(
      'UPDATE visualizations SET title = $1, description = $2, data = $3 WHERE id = $4 RETURNING *',
      [title, description, JSON.stringify(data), id]
    );
    if (result.rowCount > 0) {
      logger.info(`✅ Visualization updated successfully with ID: ${id}`);
    } else {
      logger.info(`ℹ️ No visualization updated with ID: ${id}`);
    }
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Failed to update visualization:', error);
    handleError(error, 'update visualization', id);
  }
};

// Delete Visualization
const deleteVisualization = async (id) => {
  try {
    const result = await pool.query('DELETE FROM visualizations WHERE id = $1', [id]);
    if (result.rowCount > 0) {
      logger.info(`✅ Visualization deleted successfully with ID: ${id}`);
      return { message: `Visualization with ID ${id} deleted.` };
    } else {
      logger.info(`ℹ️ No visualization found to delete with ID: ${id}`);
      return { message: `No visualization found with ID ${id}.` };
    }
  } catch (error) {
    logger.error(`❌ Failed to delete visualization with ID ${id}: ${error.message}`);
    handleError(error, 'delete visualization', id);
  }
};

// Replace the createTable function with the following:

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS visualizations (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      data JSONB NOT NULL,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    logger.info('✅ Visualizations table is ready.');
  } catch (error) {
    logger.error('❌ Failed to initialize visualizations table:', error);
  }
};

// Export functions and pool
module.exports = {
  pool,
  insertVisualization,
  getAllVisualizations,
  getVisualizationById,
  updateVisualization,
  deleteVisualization,
  createTable,
};
