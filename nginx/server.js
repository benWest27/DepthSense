const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Example route for /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (username && email && password) {
    res.status(201).json({ message: 'User registered successfully!' });
  } else {
    res.status(400).json({ error: 'Invalid input' });
  }
});

// Export the app for testing
module.exports = app;
