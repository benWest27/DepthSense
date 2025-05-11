const userModel = require('./user');
const datasetModel = require('./Dataset');
const visualizationModel = require('./Visualization');

async function initializeDatabase(pool) {
  try {
    await userModel.createUserTable?.(pool);           // ✅ safe optional call
    await datasetModel.createTable?.(pool);            // ✅ dataset createTable
    await visualizationModel.createTable?.(pool);      // ✅ visualization createTable
    console.log("✅ All tables initialized");
  } catch (err) {
    console.error("❌ Failed to initialize tables:", err);
    process.exit(1);
  }
}

module.exports = { initializeDatabase };