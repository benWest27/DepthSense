const express = require('express');
const {
  getDatasets,
  getDataset,
  createDataset,
  modifyDataset,
  removeDataset,
} = require('../controllers/datasetController');

const router = express.Router();

// Return the list of datasets
router.get('/', getDatasets);
router.get('/:id', getDataset);
router.post('/', createDataset);
router.put('/:id', modifyDataset);
router.delete('/:id', removeDataset);

module.exports = router;
