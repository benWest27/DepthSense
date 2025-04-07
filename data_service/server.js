const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5003;

// Enable CORS for all routes
app.use(cors());
// Middleware
app.use(bodyParser.json());

// Import Routes
const healthRoutes = require('./routes/health');
const datasetRoutes = require('./routes/datasets');
const userRoutes = require('./routes/users');
const visualizationRoutes = require('./routes/visualization');
const mockDataRoutes = require('./routes/mockdata'); // Ensure this route is correctly imported
const uploadRoutes = require('./routes/upload');
const rowsRoutes = require('./routes/rows');

// Register Routes
app.use('/api/health', healthRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visualization', visualizationRoutes);
app.use('/api/data/mock', mockDataRoutes);
app.use('/api/data', uploadRoutes);
app.use('/api/data/rows', rowsRoutes); // NEW: Mount CSV rows route

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'data_service' });
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  logger.info(`🚀 Data service running on port ${port}`);
});

process.on('SIGINT', async () => {
    logger.info('🛑 Closing database connection...');
    // await pool.end();
    logger.info('✅ Database connection closed.');
    process.exit(0);
  });

module.exports = { app };

