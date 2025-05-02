const { Pool } = require('pg');
const logger = require('../utils/logger');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:password@postgres:5432/paraviz'
});

async function getCSVRows(req, res) {
  const datasetId = req.params.datasetId;
  logger.info('Fetching CSV rows for dataset ID:', datasetId);        
  try {
    const result = await pool.query(
      'SELECT row_number, data FROM csv_data WHERE dataset_id = $1 ORDER BY row_number',
      [datasetId]
    );
    logger.info('Raw CSV rows query result, length:', result.rows.length);
    // Log actual rows for debugging
    console.log("getCSVRows - Query rows count:", result.rows.length);
    const csvRows = result.rows.map(row => {
      return (typeof row.data === 'string') 
        ? JSON.parse(row.data) 
        : row.data;
    });
    logger.info(`Successfully retrieved CSV rows for dataset ID: ${datasetId}`);
    res.json(csvRows);
  } catch (err) {
    logger.error('Error fetching CSV rows:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getCSVRows };
