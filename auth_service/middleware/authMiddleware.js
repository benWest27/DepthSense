const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const SECRET_KEY = process.env.JWT_SECRET || "supersecret";

exports.authMiddleware = (req, res, next) => {
  logger.info("🔍 Authenticating user...");
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
