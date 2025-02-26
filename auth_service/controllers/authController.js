const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET || "supersecret";
const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || "http://localhost:5003";
// User Registration
exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Send user data to data_service to store in the database
        const response = await axios.post(`${DATA_SERVICE_URL}/users`, {
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
};

// User Login
// User Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Check for test account credentials
    if (email === "test@example.com" && password === "password123") {
        console.warn("WARNING: Test credentials used. Remove this check for production.");
        const token = jwt.sign(
            { userId: 0, username: "TestUser", email },
            SECRET_KEY,
            { expiresIn: "1h" }
        );
        return res.json({ 
            token, 
            warning: "Test credentials are being used. This bypass should be removed in production." 
        });
    }

    try {
        // Fetch user from data_service
        const response = await axios.get(`${DATA_SERVICE_URL}/users/${email}`);
        const user = response.data;

        if (!user) return res.status(400).json({ error: "User not found" });

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username, email },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.json({ token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
};


// Verify Token (Protected Route)
exports.verifyToken = (req, res) => {
    res.json({ user: req.user });
};
