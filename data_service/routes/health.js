const express = require('express');
const logger = require('../utils/logger');
const pool = require('../database/db');  // ✅ Correct Import

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', service: 'data_service', database: 'connected' });
  } catch (err) {
    logger.error('Health check failed:', err);
    res.status(500).json({ status: 'ERROR', database: 'disconnected' });
  }
});

module.exports = router;
