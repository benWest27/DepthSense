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

exports.fetchDataForSource = function(sourceId) {
    return fetch(`http://localhost:5003/api/datasets/${sourceId}`)
        .then(resp => {
            if (!resp.ok) throw new Error("Failed to fetch dataset " + sourceId);
            return resp.json();
        })
        .then(data => {
            console.log("Dataset fetched for source", sourceId, ":", data);
            return fetch(`http://localhost:5003/api/data/rows/${data.id}`)
                .then(resp => {
                    if (!resp.ok) throw new Error("Failed to fetch CSV rows for dataset " + data.id);
                    return resp.json();
                })
                .then(csvRows => {
                    return { dataset: data, csvRows: csvRows };
                });
        });
};

exports.updateFieldsFromData = function(dataheader, DataSource) {
    console.log("updateFieldsFromData: dataheader length:", dataheader.length);
    console.log("updateFieldsFromData: dataheader content:", dataheader);
    const fields = [];
    if (dataheader.length > 0) {
        dataheader.forEach(field => {
            let type = "string";
            if (DataSource.length > 0 && DataSource[0][field] !== undefined) {
                const sampleValue = DataSource[0][field];
                console.log("updateFieldsFromData: Checking field", field, "with sample value:", sampleValue);
                if (typeof sampleValue === "string" && /[-:]/.test(sampleValue) && !isNaN(Date.parse(sampleValue))) {
                    type = "date";
                    console.log("updateFieldsFromData: Field", field, "is detected as a date.");
                } else if (!isNaN(parseFloat(sampleValue)) && isFinite(sampleValue)) {
                    type = "number";
                    console.log("updateFieldsFromData: Field", field, "is detected as a number.");
                }
            }
            fields.push({ field: field, type: type });
        });
    }
    return fields;
};

exports.tryGenerateChartForActiveLayer = function(state, DataSource, parallaxChart, container, zoomSlider, currentMouseX, currentMouseY) {
    if (state.currentLayerIndex < 0 || state.currentLayerIndex >= state.layers.length) {
        console.warn("No valid layer selected for chart generation.");
        return;
    }
    const layer = state.layers[state.currentLayerIndex];
    if (layer.colField && layer.rowField) {
        exports.processLayerData(layer, DataSource);
        exports.generateChartImage(layer, state, container, parallaxChart, zoomSlider, currentMouseX, currentMouseY);
    }
};

exports.processLayerData = function(layer, DataSource) {
    if (DataSource.length > 0 && layer.colField && layer.rowField && layer.colField.type === "date") {
        const groups = {};
        DataSource.forEach(row => {
            const dateVal = row[layer.colField.field];
            const waitTime = parseFloat(row[layer.rowField.field]);
            const dt = new Date(dateVal);
            if (isNaN(dt)) return;
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}`;
            groups[key] = groups[key] || { key, x: key, y: 0 };
            groups[key].y += waitTime;
        });
        layer.data = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
    }
    console.log(`Layer ${layer.id} data updated; ${layer.data.length} items.`);
};

exports.generateChartImage = function(layer, state, container, parallaxChart, zoomSlider, currentMouseX, currentMouseY) {
    const offscreen = document.createElement("canvas");
    offscreen.width = state.canvasWidth;
    offscreen.height = state.canvasHeight;
    const ctx = offscreen.getContext("2d");
    console.log(`generateChartImage: Generating chart for layer ${layer.id} with ${layer.data.length} data points.`);
    const chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: layer.data.map(d => d.x),
            datasets: [{
                label: "Wait Time",
                data: layer.data.map(d => d.y),
                backgroundColor: layer.color || "rgba(0,123,255,0.7)"
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: {
                x: { type: "category", grid: { display: false }, title: { display: true, text: "Time" } },
                y: { grid: { display: false }, title: { display: true, text: "Total Wait Time" } }
            },
            plugins: { legend: { display: false } }
        }
    });
    setTimeout(() => {
        const dataURL = offscreen.toDataURL();
        layer.cachedImage = dataURL;
        parallaxChart.addOrUpdateLayerImage(layer, container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
    }, 500);
};

window.editorController = {
    uploadCSV, getDatasets, getDataset,
    updateVisualization,
    fetchDataForSource,
    updateFieldsFromData,
    tryGenerateChartForActiveLayer,
    processLayerData,
    generateChartImage
};