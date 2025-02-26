const jwt = require('jsonwebtoken');
const { registerUser, findUserByUsernameOrEmail, getAllUsers, deleteUserById } = require('../models/user');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register a new user
const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await findUserByUsernameOrEmail(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Register user
    const newUser = await registerUser(username, email, password);
    res.status(201).json({ message: 'Registration successful', user: newUser });
  } catch (error) {
    logger.error('❌ Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User login
const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await findUserByUsernameOrEmail(identifier);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    logger.error('❌ Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    logger.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const result = await deleteUserById(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getUsers,
  deleteUser,
};
