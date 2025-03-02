const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 5003;

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import Routes
const healthRoutes = require('./routes/health');
const datasetRoutes = require('./routes/datasets');
const userRoutes = require('./routes/users');
const visualizationRoutes = require('./routes/visualization');
const mockDataRoutes = require('./routes/mockdata');

// Register Routes
app.use('/api/health', healthRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visualization', visualizationRoutes);
app.use('/api/mockdata', mockDataRoutes);

// Start Server
app.listen(port, () => {
  logger.info(`🚀 Data service running on port ${port}`);
});

process.on('SIGINT', async () => {
    logger.info('🛑 Closing database connection...');
    await pool.end();
    logger.info('✅ Database connection closed.');
    process.exit(0);
  });

// In server.js
// ...

module.exports = { app };

