// dataLoader.js
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

function loadMockData() {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(__dirname, 'mock', 'download_tianasbayouadventure_jan_23380_2025_03_02_11_55_34.csv');
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports = { loadMockData };
