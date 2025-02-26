const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const editorController = require('../controllers/editorController');

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is CSV
    if (file.mimetype !== 'text/csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// CSV upload endpoint
router.post('/upload-csv',
  upload.single('file'),
  [
    body().custom((_, { req }) => {
      if (!req.file) {
        throw new Error('No file uploaded');
      }
      return true;
    })
  ],
  editorController.uploadCSV
);

// Get datasets endpoint
router.get('/datasets', editorController.getDatasets);

// Get specific dataset endpoint
router.get('/datasets/:id', editorController.getDataset);

module.exports = router;
