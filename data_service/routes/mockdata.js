// data_service/routes/mockData.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Ensure csv-parser is installed and imported

const router = express.Router();

// This route reads the CSV file and returns the data as JSON
router.get('/', (req, res) => {
  console.log("GET /api/data/mock route hit");
  const results = [];
  const csvFilePath = path.join(__dirname, '../mock/download_tianasbayouadventure_jan_23380_2025_03_02_11_55_34.csv');

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      console.log("CSV parsing complete. Sending data.");
      res.json(results);
    })
    .on('error', (error) => {
      console.error("Error reading CSV:", error);
      res.status(500).json({ error: error.message });
    });
});

// Example route to parse a CSV file
router.get('/parse', (req, res) => {
  const results = [];
  const filePath = path.join(__dirname, '../data/sample.csv'); // Adjust the path as needed

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    })
    .on('error', (err) => {
      console.error('Error reading CSV file:', err);
      res.status(500).json({ error: 'Failed to parse CSV file' });
    });
});

module.exports = router;
