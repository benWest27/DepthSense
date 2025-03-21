const snakeCase = window._ && _.snakeCase ? _.snakeCase : function(str){ return str.toLowerCase().replace(/\s+/g, '_'); };

/**
 * Infers PostgreSQL data type from sample values
 * @param {Array<any>} values Sample values from the column
 * @returns {string} PostgreSQL data type
 */
function inferDataType(values) {
  const nonNullValues = values.filter(v => v !== null && v !== '');
  if (nonNullValues.length === 0) return 'TEXT';

  // Try parsing as number
  const numberValues = nonNullValues.every(v => !isNaN(v));
  if (numberValues) {
    const hasDecimals = nonNullValues.some(v => v.includes('.'));
    return hasDecimals ? 'DOUBLE PRECISION' : 'INTEGER';
  }

  // Try parsing as date
  const dateValues = nonNullValues.every(v => !isNaN(Date.parse(v)));
  if (dateValues) return 'TIMESTAMP';

  return 'TEXT';
}

/**
 * Creates a table for the dataset and stores CSV data
 * @param {Array<Object>} records CSV records
 * @param {Array<string>} columns Column names
 * @returns {Promise<Object>} Result with dataset ID and field information
 */
async function storeCSVInDB(records, columns) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create dataset entry
    const datasetResult = await client.query(
      'INSERT INTO datasets (name, description) VALUES ($1, $2) RETURNING id',
      [`dataset_${Date.now()}`, 'Imported CSV dataset']
    );
    const datasetId = datasetResult.rows[0].id;

    // Infer data types for each column
    const columnTypes = columns.map(column => {
      const values = records.map(record => record[column]);
      return {
        name: snakeCase(column),
        type: inferDataType(values)
      };
    });

    // Create table for this dataset
    const tableName = `dataset_${datasetId}_data`;
    const createTableSQL = `
      CREATE TABLE ${tableName} (
        id SERIAL PRIMARY KEY,
        ${columnTypes.map(col => `${col.name} ${col.type}`).join(',\n        ')}
      )
    `;
    await client.query(createTableSQL);

    // Prepare bulk insert
    const values = records.map(record => 
      columns.map(col => record[col])
    );
    
    const placeholders = values.map((_, i) => 
      `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    ).join(', ');

    const insertSQL = `
      INSERT INTO ${tableName} (${columnTypes.map(col => col.name).join(', ')})
      VALUES ${placeholders}
    `;

    await client.query(insertSQL, values.flat());

    await client.query('COMMIT');

    return {
      datasetId,
      fields: columnTypes.map(col => ({
        name: col.name,
        type: col.type,
        originalName: columns[columnTypes.findIndex(c => c.name === col.name)]
      }))
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves all datasets
 * @returns {Promise<Array>} List of datasets
 */
async function getDatasets() {
  const result = await pool.query('SELECT * FROM datasets ORDER BY created_at DESC');
  return result.rows;
}

/**
 * Retrieves a specific dataset by ID
 * @param {number} id Dataset ID
 * @returns {Promise<Object>} Dataset information
 */
async function getDataset(id) {
  const result = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;

  const dataset = result.rows[0];
  const tableName = `dataset_${id}_data`;
  
  // Get table schema
  const schemaQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    AND column_name != 'id'
  `;
  const schemaResult = await pool.query(schemaQuery, [tableName]);
  
  dataset.fields = schemaResult.rows;
  return dataset;
}

// Optionally expose functions if needed:
window.upload = {
  inferDataType,
  storeCSVInDB,
  getDatasets,
  getDataset
};
