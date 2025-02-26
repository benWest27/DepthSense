const { validationResult } = require('express-validator');
const { parse } = require('csv-parse');
const parallaxService = require("../services/parallaxService");
const fs = require('fs');
const uploadService = require('../services/uploadService');

exports.uploadCSV = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate file exists and is CSV
    if (!req.file || req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ error: 'Please upload a valid CSV file' });
    }

    // Parse CSV file
    const parser = fs.createReadStream(req.file.path).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    );

    const records = [];
    const columns = new Set();

    // Process CSV data
    for await (const record of parser) {
      // Collect column names
      Object.keys(record).forEach(col => columns.add(col));
      records.push(record);
    }

    // Validate that CSV is not empty
    if (records.length === 0 || columns.size === 0) {
      return res.status(400).json({ error: 'CSV file is empty or contains no valid data' });
    }

    // Store data in database
    const result = await uploadService.storeCSVInDB(records, Array.from(columns));

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Return success response with field information
    res.status(200).json({
      message: 'Upload successful!',
      datasetId: result.datasetId,
      fields: result.fields
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error.message
    });
  }
};

exports.getDatasets = async (req, res) => {
  try {
    const datasets = await uploadService.getDatasets();
    res.status(200).json(datasets);
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Failed to retrieve datasets' });
  }
};

exports.getDataset = async (req, res) => {
  try {
    const dataset = await uploadService.getDataset(req.params.id);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    res.status(200).json(dataset);
  } catch (error) {
    console.error('Get dataset error:', error);
    res.status(500).json({ error: 'Failed to retrieve dataset' });
  }
};

exports.updateVisualization = (req, res) => {
  try {
      parallaxService.updateState(req.body);
      const transformedLayers = parallaxService.renderVisualization();
      res.json({ success: true, layers: transformedLayers });
  } catch (error) {
      res.status(500).json({ success: false, error: error.message });
  }
};