const { 
    insertVisualization,
    getAllVisualizations,
    getVisualizationById,
    updateVisualization,
    deleteVisualization,
} = require('../models/Visualization');
  const logger = require('../utils/logger');
  
  // Get all visualizations
  const getVisualizations = async (req, res) => {
    try {
      const visualizations = await getAllVisualizations();
      logger.info('✅ Successfully fetched visualizations');
      res.json(visualizations);
    } catch (error) {
      logger.error('❌ Error fetching visualizations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Get visualization by ID
  const getVisualization = async (req, res) => {
    try {
      const visualization = await getVisualizationById(req.params.id);
      if (!visualization) {
        logger.warn(`🟡 Visualization with ID ${req.params.id} not found`);
        return res.status(404).json({ message: 'Visualization not found' });
      }
      logger.info(`✅ Successfully fetched visualization with ID ${req.params.id}`);
      res.json(visualization);
    } catch (error) {
      logger.error(`❌ Error fetching visualization with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  // Create new visualization
  const createVisualization = async (req, res) => {
    const { title, description, data } = req.body;
    const createdBy = req.user?.userId || null; // Requires authentication middleware

    try {
      const newVisualization = await insertVisualization(title, description, data, createdBy);
      logger.info(`✅ Successfully created visualization with title "${title}"`);
      res.status(201).json(newVisualization);
    } catch (error) {
      logger.error('❌ Error creating visualization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Update visualization
  const modifyVisualization = async (req, res) => {
    const { title, description, data } = req.body;
    try {
      const updatedVisualization = await updateVisualization(req.params.id, title, description, data);
      logger.info(`✅ Successfully updated visualization with ID ${req.params.id}`);
      res.json(updatedVisualization);
    } catch (error) {
      logger.error(`❌ Error updating visualization with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Delete visualization
  const removeVisualization = async (req, res) => {
    try {
      const result = await deleteVisualization(req.params.id);
      logger.info(`✅ Successfully deleted visualization with ID ${req.params.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`❌ Error deleting visualization with ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  module.exports = {
    getVisualizations,
    getVisualization,
    createVisualization,
    modifyVisualization,
    removeVisualization,
  };
  