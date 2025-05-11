const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const logger = require("../utils/logger");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET || "supersecret";

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "paraviz",
    user: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "password",
});

// User Registration
exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;
    logger.info("Register endpoint hit with data:", { username, email, role }); // Updated to logger.info
    if (!["admin", "creator", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
    }
    logger.info("🔍 Registering user:", { username, email, role });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        logger.info("Password hashed successfully."); // Updated to logger.info

        await pool.query(
            "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)",
            [username, email, hashedPassword, role]
        );
        logger.info("User inserted into database."); // Updated to logger.info

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        logger.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
};

// User Login
exports.login = async (req, res) => {
    const { username, password } = req.body; // changed: use username
    logger.info("🔍 Logging in user:", { username });
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]); // changed query
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Verify Token
exports.verifyToken = (req, res) => {
    logger.info("🔍 Verifying token");
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (!["admin", "creator", "viewer"].includes(decoded.role)) {
            throw new Error("Invalid role");
        }
        res.json({ user: decoded });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
};