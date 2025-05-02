const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const cors = require('cors');
const createPoolWithRetry = require('./database/db.js');
const { initializeDatabase } = require('./models/init');

const app = express();
const port = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
const healthRoutes = require('./routes/health');
const datasetRoutes = require('./routes/datasets');
const userRoutes = require('./routes/users');
const visualizationRoutes = require('./routes/visualization');
const mockDataRoutes = require('./routes/mockdata');
const uploadRoutes = require('./routes/upload');
const rowsRoutes = require('./routes/rows');

// Async startup
(async () => {
  const pool = await createPoolWithRetry(); // connect to DB with retry
  await initializeDatabase(pool); // create tables

  // Route mounting AFTER DB is ready
  app.use('/api/health', healthRoutes);
  app.use('/api/datasets', datasetRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/visualization', visualizationRoutes);
  app.use('/api/data/mock', mockDataRoutes);
  app.use('/api/data', uploadRoutes);
  app.use('/api/data/rows', rowsRoutes);

  app.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 Data service running on port ${port}`);
  });

  process.on('SIGINT', async () => {
    logger.info('🛑 Closing database connection...');
    await pool.end();
    logger.info('✅ Database connection closed.');
    process.exit(0);
  });
})();
