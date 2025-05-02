const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const SECRET_KEY = process.env.JWT_SECRET || "supersecret";

/**
 * Verifies the JWT token and checks user roles.
 * @param {string} token - The JWT token from the Authorization header.
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the resource.
 * @returns {Object} - Decoded token payload if valid.
 * @throws {Error} - Throws an error if the token is invalid or the role is not allowed.
 */
const authorize = (token, allowedRoles) => {
  if (!token) {
    throw new Error("Missing token");
  }
  logger.info("🔍 Authorizing user with token...");
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (!["admin", "creator", "viewer"].includes(decoded.role)) {
      throw new Error("Invalid role");
    }
    if (!allowedRoles.includes(decoded.role)) {
      throw new Error("Access denied: insufficient privileges");
    }
    return decoded;
  } catch (error) {
    logger.error("Authorization error:", error.message);
    throw new Error("Invalid token or insufficient privileges");
  }
};

module.exports = { authorize };
