const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const config = require("config");
const { Pool } = require("pg");
const logger = require("./utils/logger"); // Import Winston Logger
const morgan = require("morgan");

// Import Routes
const authRoutes = require("./routes/authroutes");

// Initialize Express App
const app = express();
const port = config.get("serverPort") || 5000;

// Database setup
const pool = new Pool({
  host: config.get("db.host"),
  port: config.get("db.port"),
  database: config.get("db.database"),
  user: config.get("db.user"),
  password: config.get("db.password"),
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use Morgan to log HTTP requests in a combined format
app.use(morgan("combined", { stream: logger.stream }));

logger.info("🔗 Auth service starting...");
// Health Check Route
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    logger.info("Health check successful");
    res.status(200).json({ status: "OK", service: "auth_service", database: "connected" });
  } catch (error) {
    logger.error("Health check failed", { error: error.message });
    res.status(500).json({ status: "ERROR", service: "auth_service", database: "disconnected", error: error.message });
  }
});

// Mount API Routes
app.use("/api/auth", authRoutes);

// Serve static files (if applicable)
app.use(express.static(path.join(__dirname, "public")));

// Handle React routing (if applicable)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Start Server
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Auth service running at http://localhost:${port}`);
  });
}

// Export for testing
module.exports = { app, pool };
