const { insertDataset, getAllDatasets, getDatasetById, updateDataset, deleteDataset } = require('../models/Dataset');
const logger = require('../utils/logger');

// Get All Datasets
const getDatasets = async (req, res) => {
  try {
    const datasets = await getAllDatasets();
    res.json(datasets);
  } catch (error) {
    logger.error('Error fetching datasets:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Dataset by ID
const getDataset = async (req, res) => {
  try {
    const dataset = await getDatasetById(req.params.id);
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found' });
    }
    res.json(dataset);
  } catch (error) {
    logger.error(`Error fetching dataset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Create Dataset
const createDataset = async (req, res) => {
  const { name, value } = req.body;
  try {
    const newDataset = await insertDataset(name, value);
    res.status(201).json(newDataset);
  } catch (error) {
    logger.error('Error inserting dataset:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update Dataset
const modifyDataset = async (req, res) => {
  const { name, value } = req.body;
  try {
    const updatedDataset = await updateDataset(req.params.id, name, value);
    res.json(updatedDataset);
  } catch (error) {
    logger.error(`Error updating dataset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Delete Dataset
const removeDataset = async (req, res) => {
  try {
    const result = await deleteDataset(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error(`Error deleting dataset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDatasets,
  getDataset,
  createDataset,
  modifyDataset,
  removeDataset,
};
