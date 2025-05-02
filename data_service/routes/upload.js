const express = require('express');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { processCSVUpload } = require('../controllers/uploadController');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/upload', upload.single('csvfile'), async (req, res) => {
  logger.info('Received file:', req.file);
  // Attach custom filename from body if provided.
  if (req.body.filename) {
    req.file.customFilename = req.body.filename;
  }
  try {
    const result = await processCSVUpload(req.file);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
