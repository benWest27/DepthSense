const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { processCSVUpload } = require('../controllers/uploadController');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/upload', upload.single('csvfile'), async (req, res) => {
    logger.info('Received file:', req.file);
  try {
    const result = await processCSVUpload(req.file);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
