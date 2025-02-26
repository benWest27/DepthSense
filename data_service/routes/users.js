const express = require('express');
const { register, login, getUsers, deleteUser } = require('../controllers/userController');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Admin routes
router.get('/', getUsers);
router.delete('/:id', deleteUser);

module.exports = router;
