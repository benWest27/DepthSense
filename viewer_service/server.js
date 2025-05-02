const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const fs = require('fs'); // Add if not already present
const fetch = global.fetch || require('node-fetch'); // Use built-in fetch (Node 18+) or fallback

// NEW: Use logger instead of console.
const logger = require('./utils/logger');

const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1', // Changed default from 'localhost' to '127.0.0.1'
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'depthsense',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password'
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error:', err);
  } else {
    logger.info('Database connected successfully');
  }
});

// Create editor app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files before authentication middleware
// Remove or comment out the old static mount:
// app.use(express.static(path.join(__dirname, 'public')));

// New: Serve static files under "/viewer"
app.use('/viewer', express.static(path.join(__dirname, 'public')));

// Apply authentication only for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) { // only protect API endpoints
    const token = req.header("Authorization")?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (!["admin", "creator", "viewer"].includes(decoded.role)) {
        return res.status(403).json({ error: "Access denied: insufficient privileges" });
      }
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    
    res.status(200).json({
      status: 'OK',
      service: 'visualization_service_editor',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      service: 'visualization_service_editor',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Role verification middleware
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
    logger.error('Role verification error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Editor routes
// Apply role verification to all routes
//app.use(verifyRole(['admin', 'creator', 'viewer']));

// Layer Management Routes
const router = express.Router();

// List all layers
router.get('/api/layers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.name, v.config, d.name as dataset_name
       FROM visualizations v
       LEFT JOIN datasets d ON v.dataset_id = d.id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Layer list error:', error);
    res.status(500).json({ error: 'Failed to retrieve layers' });
  }
});

// Create new layer
router.post('/api/layers', async (req, res) => {
  try {
    const { name, type, dataset_id } = req.body;
    const result = await pool.query(
      `INSERT INTO visualizations (user_id, dataset_id, name, config)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, config`,
      [req.user.id, dataset_id || null, name, JSON.stringify({ type, visible: true })]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Layer creation error:', error);
    res.status(500).json({ error: 'Failed to create layer' });
  }
});

// Get layer details
router.get('/api/layers/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.name, v.config, d.name as dataset_name,
              d.column_names, d.row_count
       FROM visualizations v
       LEFT JOIN datasets d ON v.dataset_id = d.id
       WHERE v.id = $1 AND v.user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    if (result.rows[0].dataset_name) {
      const dataResult = await pool.query(
        `SELECT data FROM csv_data
         WHERE dataset_id = $1
         ORDER BY row_number`,
        [result.rows[0].dataset_id]
      );
      result.rows[0].data = dataResult.rows.map(row => row.data);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Layer retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve layer' });
  }
});

// Update layer visibility
router.patch('/api/layers/:id/visibility', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { visible } = req.body;
    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'Visibility must be a boolean' });
    }
    
    const result = await client.query(
      `UPDATE visualizations 
       SET config = jsonb_set(config::jsonb, '{visible}', $1::jsonb)
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, config`,
      [JSON.stringify(visible), req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Layer visibility update error:', error);
    res.status(500).json({ error: 'Failed to update layer visibility' });
  } finally {
    client.release();
  }
});

// Delete layer
router.delete('/api/layers/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      `SELECT id FROM visualizations 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    await client.query(
      'DELETE FROM visualizations WHERE id = $1',
      [req.params.id]
    );
    
    await client.query('COMMIT');
    res.json({ status: 'success' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Layer deletion error:', error);
    res.status(500).json({ error: 'Failed to delete layer' });
  } finally {
    client.release();
  }
});

// Use the router
app.use(router);

// CSV Data Management
app.post('/api/csv', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { filename, columns, rows } = req.body;
    
    // Create dataset entry
    const datasetResult = await client.query(
      `INSERT INTO datasets (name, user_id, column_names, row_count, file_type) 
       VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING id`,
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
    res.status(201).json({ id: datasetId, filename, columns, rowCount: rows.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to upload CSV data' });
  } finally {
    client.release();
  }
});

app.get('/api/csv', async (req, res) => {
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
    logger.error('CSV list error:', error);
    res.status(500).json({ error: 'Failed to retrieve CSV files' });
  }
});

app.get('/api/csv/:id', async (req, res) => {
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
    logger.error('CSV retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve CSV data' });
  }
});

app.delete('/api/csv/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verify ownership and existence
    const datasetResult = await client.query(
      `SELECT id FROM datasets 
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
    logger.error('CSV deletion error:', error);
    res.status(500).json({ error: 'Failed to delete CSV file' });
  } finally {
    client.release();
  }
});

// Update layer visibility
// Layer Management Routes
app.post('/api/layers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, type, datasetId } = req.body;
    
    const result = await client.query(
      `INSERT INTO visualizations (user_id, dataset_id, name, config)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, config`,
      [req.user.id, datasetId || null, name, JSON.stringify({ type, visible: true })]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Layer creation error:', error);
    res.status(500).json({ error: 'Failed to create layer' });
  } finally {
    client.release();
  }
});

app.get('/api/layers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.name, v.config, d.name as dataset_name
       FROM visualizations v
       LEFT JOIN datasets d ON v.dataset_id = d.id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Layer list error:', error);
    res.status(500).json({ error: 'Failed to retrieve layers' });
  }
});

app.get('/api/layers/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.name, v.config, d.name as dataset_name,
              d.column_names, d.row_count
       FROM visualizations v
       LEFT JOIN datasets d ON v.dataset_id = d.id
       WHERE v.id = $1 AND v.user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    // If there's associated dataset data, fetch it
    if (result.rows[0].dataset_name) {
      const dataResult = await pool.query(
        `SELECT data FROM csv_data
         WHERE dataset_id = $1
         ORDER BY row_number`,
        [result.rows[0].dataset_id]
      );
      result.rows[0].data = dataResult.rows.map(row => row.data);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Layer retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve layer' });
  }
});

app.delete('/api/layers/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verify ownership and existence
    const result = await client.query(
      `SELECT id FROM visualizations 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    // Delete layer
    await client.query(
      'DELETE FROM visualizations WHERE id = $1',
      [req.params.id]
    );
    
    await client.query('COMMIT');
    res.json({ status: 'success' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Layer deletion error:', error);
    res.status(500).json({ error: 'Failed to delete layer' });
  } finally {
    client.release();
  }
});

app.patch('/api/layers/:id/visibility', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { visible } = req.body;
    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'Visibility must be a boolean value' });
    }
    
    // Update visibility in visualization config
    const result = await client.query(
      `UPDATE visualizations 
       SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{visible}', $1::jsonb)
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, config`,
      [JSON.stringify(visible), req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Visibility update error:', error);
    res.status(500).json({ error: 'Failed to update layer visibility' });
  } finally {
    client.release();
  }
});

app.get('/dashboard', (req, res) => {
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
    logger.error('Editor dashboard error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// New route to handle viewer requests with a visualization ID
app.get('/viewer', async (req, res) => {
  const vizId = req.query.id;
  logger.info("[Viewer] Received request for visualization ID:", vizId);
  let vizData = null;
  if (vizId) {
    try {
      const vizResp = await fetch(`http://data_service/api/visualization/${vizId}`, {
        headers: { 'Authorization': req.headers["authorization"] || '' }
      });
      if (vizResp.ok) {
        vizData = await vizResp.json();
        logger.info("[Viewer] Successfully fetched visualization data for ID:", vizId);
      } else {
        logger.error("[Viewer] Failed to fetch visualization data. Status:", vizResp.status, vizResp.statusText);
      }
    } catch (error) {
      logger.error("[Viewer] Error fetching visualization:", error);
    }
  } else {
    logger.warn("[Viewer] No visualization ID provided in query parameters.");
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      logger.error("[Viewer] Error reading index.html:", err);
      return res.status(500).send("Error loading page");
    }
    logger.info("[Viewer] Successfully read index.html.");
    if (vizData) {
      const injection = `<script>window.initialVisualization = ${JSON.stringify(vizData)};</script>`;
      html = html.replace('</head>', injection + '</head>');
      logger.info("[Viewer] Injected visualization data into index.html.");
    } else {
      logger.warn("[Viewer] No visualization data to inject.");
    }
    res.send(html);
  });
});

// Serve public files for the Viewer Service
// Fallback: send index.html for all unmatched routes (for SPA routing)
app.get(['/viewer', '/viewer/*'], (req, res) => {
  logger.info("[Viewer] Fallback route triggered, serving index.html.");
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start editor service
const port = 5002;

app.listen(port, () => {
  logger.info(`[Viewer] Service listening at http://localhost:${port}`);
});
