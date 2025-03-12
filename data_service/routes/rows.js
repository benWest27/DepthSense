const express = require('express');
const router = express.Router();
const { getCSVRows } = require('../controllers/csvDataController');

router.get('/:datasetId', getCSVRows);

module.exports = router;
