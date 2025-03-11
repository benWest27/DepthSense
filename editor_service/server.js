const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const shouldAuthenticate = process.env.NODE_ENV !== 'development';



// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'OK',
      service: 'visualization_service_editor',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      service: 'visualization_service_editor',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
//app.use('/editor', (req, res, next) => {
//  console.log('Request for /editor:', req.url);
//  next();
//});
// 1) Serve the Editor UI at /editor (no auth required)
app.use('/editor', express.static(path.join(__dirname, 'public')));


// Role verification middleware (for APIs)
const verifyRole = (allowedRoles) => (req, res, next) => {
  try {
    const userHeader = req.headers['user'];
    if (!userHeader) {
      return res.status(401).json({ error: 'User information missing' });
    }

    const user = JSON.parse(userHeader);
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Role verification error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 2) Create a router for all Editor APIs under /api/editor
const router = express.Router();

// ---------------------- CSV DATA MANAGEMENT ----------------------
router.post('/csv', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { filename, columns, rows } = req.body;
    
    // Create dataset entry
    const datasetResult = await client.query(
      `INSERT INTO datasets (name, user_id, column_names, row_count, file_type)
       VALUES ($1, $2, $3::jsonb, $4, $5) 
       RETURNING id`,
      [filename, req.user.id, JSON.stringify(columns), rows.length, 'csv']
    );
    
    const datasetId = datasetResult.rows[0].id;
    
    // Insert CSV data rows
    for (let i = 0; i < rows.length; i++) {
      await client.query(
        `INSERT INTO csv_data (dataset_id, row_number, data)
         VALUES ($1, $2, $3::jsonb)`,
        [datasetId, i, JSON.stringify(rows[i])]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json({
      id: datasetId, 
      filename, 
      columns, 
      rowCount: rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to upload CSV data' });
  } finally {
    client.release();
  }
});

router.get('/csv', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, column_names, row_count, created_at
         FROM datasets
        WHERE user_id = $1 AND file_type = 'csv'
        ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('CSV list error:', error);
    res.status(500).json({ error: 'Failed to retrieve CSV files' });
  }
});

router.get('/csv/:id', async (req, res) => {
  try {
    // Get dataset metadata
    const datasetResult = await pool.query(
      `SELECT id, name, column_names, row_count
         FROM datasets
        WHERE id = $1 AND user_id = $2 AND file_type = 'csv'`,
      [req.params.id, req.user.id]
    );
    
    if (datasetResult.rows.length === 0) {
      return res.status(404).json({ error: 'CSV file not found' });
    }
    
    // Get CSV data rows
    const dataResult = await pool.query(
      `SELECT row_number, data
         FROM csv_data
        WHERE dataset_id = $1
        ORDER BY row_number`,
      [req.params.id]
    );
    
    res.json({
      metadata: datasetResult.rows[0],
      rows: dataResult.rows.map(row => row.data)
    });
  } catch (error) {
    console.error('CSV retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve CSV data' });
  }
});

router.delete('/csv/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verify ownership and existence
    const datasetResult = await client.query(
      `SELECT id 
         FROM datasets
        WHERE id = $1 AND user_id = $2 AND file_type = 'csv'`,
      [req.params.id, req.user.id]
    );
    
    if (datasetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'CSV file not found' });
    }
    
    // Delete dataset (cascade will handle csv_data)
    await client.query(
      'DELETE FROM datasets WHERE id = $1',
      [req.params.id]
    );
    
    await client.query('COMMIT');
    res.json({ status: 'success' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CSV deletion error:', error);
    res.status(500).json({ error: 'Failed to delete CSV file' });
  } finally {
    client.release();
  }
});

// ---------------------- DASHBOARD ----------------------
router.get('/dashboard', (req, res) => {
  try {
    const dashboardData = {
      user: req.user.username,
      role: req.user.role,
      recentVisualizations: [
        { id: 1, name: 'Visualization 1', canEdit: true },
        { id: 2, name: 'Visualization 2', canEdit: true },
      ],
      editorFeatures: {
        canCreate: true,
        canEdit: true,
        canDelete: true
      }
    };
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Editor dashboard error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3) Apply role verification to the API, then mount the router
if (shouldAuthenticate) {
  //app.use(verifyRole(['admin', 'creator']));
} else {
  console.log("Development mode: Skipping authentication middleware.");
}

app.use('/api/editor', router);

// Start editor service
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}/editor`);
});