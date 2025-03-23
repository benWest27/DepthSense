const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Configure your PostgreSQL connection.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:password@postgres:5432/paraviz' // was .../depthsense
});

/**
 * Process a CSV upload by reading its content, inserting a new row in the datasets table,
 * and storing each CSV row into the csv_data table.
 *
 * The dataset name is derived from the CSV file name (abbreviated to 20 characters).
 *
 * @param {Object} file - The file object from the upload.
 * @returns {Promise<Object>} - A promise that resolves with information about the processed CSV.
 */
async function processCSVUpload(file) {
  logger.info('Processing CSV upload for file:', file.originalname);
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(file.path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Extract column names from the first row (if available).
          const columnNames = results.length > 0 ? Object.keys(results[0]) : [];
          // Use the provided filename from the filename-input (assumed to be attached as customFilename)
          // Otherwise fall back to file.originalname.
          const providedName = file.customFilename || file.originalname;
          const baseName = providedName ? 
            path.basename(providedName, path.extname(providedName)) : 
            path.basename(file.path);
          const datasetName = baseName.substring(0, 20);
          
          // Begin a transaction.
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            // Insert a new row into the datasets table.
            const insertDatasetText = `
              INSERT INTO datasets (user_id, name, description, column_names, row_count, file_type)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id
            `;
            const datasetValues = [
              1, // Assuming admin user has ID 1.
              datasetName,
              'CSV upload',
              JSON.stringify(columnNames),
              results.length,
              'csv'
            ];
            const resDataset = await client.query(insertDatasetText, datasetValues);
            const datasetId = resDataset.rows[0].id;

            // Insert each CSV row into the csv_data table.
            const insertCSVText = `
              INSERT INTO csv_data (dataset_id, row_number, data)
              VALUES ($1, $2, $3)
            `;
            for (let i = 0; i < results.length; i++) {
              const rowNumber = i + 1;
              const rowData = results[i];
              await client.query(insertCSVText, [datasetId, rowNumber, JSON.stringify(rowData)]);
            }

            await client.query('COMMIT');
            resolve({
              message: 'CSV upload processed and stored',
              rowCount: results.length,
              datasetId: datasetId
            });
          } catch (err) {
            logger.error('Error processing CSV upload:', err);
            await client.query('ROLLBACK');
            reject(err);
          } finally {
            logger.info('CSV upload completed for file:', file.originalname);
            client.release();
          }
        } catch (err) {
          logger.error('Error during CSV upload:', err);
          reject(err);
        }
      })
      .on('error', reject);
  });
}

module.exports = { processCSVUpload };
