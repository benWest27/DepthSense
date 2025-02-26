const express = require('express');
const {
  getVisualizations,
  getVisualization,
  createVisualization,
  modifyVisualization,
  removeVisualization,
} = require('../controllers/visualizationController');

const router = express.Router();

// Public routes
router.get('/', getVisualizations);
router.get('/:id', getVisualization);

// Protected routes (Require authentication middleware)
router.post('/', createVisualization);
router.put('/:id', modifyVisualization);
router.delete('/:id', removeVisualization);

module.exports = router;
