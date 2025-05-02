const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'paraviz',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

// Ensure the users table exists
const createUserTable = async (pool) => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    logger.info('✅ Users table is ready.');
  } catch (error) {
    logger.error('❌ Failed to initialize users table:', error);
  }
};

// Register a new user
const registerUser = async (username, email, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role',
      [username, email, hashedPassword]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Error registering user:', error);
    throw error;
  }
};

// Find user by username or email
const findUserByUsernameOrEmail = async (identifier) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = $1 OR email = $2',
      [identifier, identifier]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Error fetching user:', error);
    throw error;
  }
};

// Get all users (admin use)
const getAllUsers = async () => {
  try {
    const result = await pool.query('SELECT id, username, email, role, created_at FROM users');
    return result.rows;
  } catch (error) {
    logger.error('❌ Error fetching all users:', error);
    throw error;
  }
};

// Delete user by ID (admin use)
const deleteUserById = async (id) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { message: `User with ID ${id} deleted.` };
  } catch (error) {
    logger.error('❌ Error deleting user:', error);
    throw error;
  }
};

// Initialize table on startup
createUserTable();

module.exports = {
  registerUser,
  findUserByUsernameOrEmail,
  getAllUsers,
  deleteUserById,
  createUserTable // ✅ add this to export the initializer
};