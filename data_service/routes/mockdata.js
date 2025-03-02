// routes/mockData.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Make sure to install: npm install csv-parser

const router = express.Router();

router.get('/', (req, res) => {
  const results = [];
  const csvFilePath = path.join(__dirname, '../mock/download_tianasbayouadventure_jan_23380_2025_03_02_11_55_34.csv');

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    })
    .on('error', (error) => {
      res.status(500).json({ error: error.message });
    });
});

module.exports = router;
