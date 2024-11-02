// authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON, respondWithImage } = require('./modules/utils');
const initializeDB = require('./modules/connection');
const {connectML} = require('./modules/connectML');
const pool = require('./modules/dbConfig');

const SECRET_KEY = 'your-secret-key';
const saltRounds = 12;

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"), false);
        }
    }
});

// Middleware to validate JWT token
const validateToken = async (req, res, next) => {
    const token = req.cookies.authToken;
    let connection;
    
    if (!token) {
        return respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
    }

    try {
        // Get a connection from the pool
        connection = await pool.getConnection();
        const [blacklistedToken] = await connection.query(
            'SELECT * FROM token_blacklist WHERE token = ?',
            [token]
        );

        if (blacklistedToken.length > 0) {
            return respondWithJSON(res, { message: "Token is blacklisted" }, 403);
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return respondWithJSON(res, { message: "Token expired" }, 403);
        }
        return respondWithJSON(res, { message: "Invalid token" }, 403);
    } finally {
        if (connection) connection.release(); // Release the connection back to the pool
    }
};
const validateAdmin = (req, res, next) => {
    if (req.user.userType === "admin") {
        next();  // If the user is an admin, proceed to the route
    } else {
        respondWithJSON(res, { message: "Unauthorized access" }, 403); // Deny access
    }
};

// Register new user
router.post('/register', async (req, res) => {
    let connection;
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return respondWithJSON(res, { message: "All fields are required" }, 400);
        }

        connection = await pool.getConnection();

        // Check existing user
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return respondWithJSON(res, { message: "Email or username already exists" }, 409);
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert user
        const [result] = await connection.query(
            'INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, 'user']
        );

        const [newUser] = await connection.query(
            'SELECT id, email, user_type FROM users WHERE id = ?',
            [result.insertId]
        );

        const token = jwt.sign(
            { userId: newUser[0].id, email: newUser[0].email, role: newUser[0].user_type },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('authToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
            sameSite: 'None'
        });

        respondWithJSON(res, {
            message: "Login successful and User created successfully",
            token,
            user: {
                id: newUser[0].id,
                email: newUser[0].email,
                userType: newUser[0].user_type
            }
        }, 201);
    } catch (error) {
        respondWithJSON(res, { message: "Internal server error" }, 500);
    } finally {
        if (connection) connection.release(); // Release the connection back to the pool
    }
});

// Login
router.post('/login', async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;
        connection = await pool.getConnection();
        
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return respondWithJSON(res, { message: "Invalid credentials" }, 401);
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return respondWithJSON(res, { message: "Invalid credentials" }, 401);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.user_type },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('authToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
            sameSite: 'None'
        });

        respondWithJSON(res, {
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                userType: user.user_type
            }
        });
    } catch (error) {
        respondWithJSON(res, { message: "Internal server error" }, 500);
    } finally {
        if (connection) connection.release(); // Release the connection back to the pool
    }
});

// Check if signed in
router.post('/signedin', validateToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [userResult] = await connection.query(
            'SELECT user_type FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (userResult.length === 0) {
            return respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
        }

        respondWithJSON(res, {
            message: MESSAGES.SUCCESS_QUERY,
            user_type: userResult[0].user_type
        });
    } catch (error) {
        respondWithJSON(res, { message: "Internal server error" }, 500);
    }
});

// Logout
router.get('/logout', validateToken, async (req, res) => {
    try {
        const token = req.cookies.authToken;
        connection = await pool.getConnection();
        
        const decoded = jwt.decode(token);
        const expiryDate = new Date(decoded.exp * 1000);

        await connection.query(
            'INSERT INTO token_blacklist (token, expiry) VALUES (?, ?)',
            [token, expiryDate]
        );

        res.clearCookie('authToken');
        respondWithJSON(res, { message: "Logout successful" });
    } catch (error) {
        respondWithJSON(res, { message: "Internal server error" }, 500);
    } finally {
        if (connection) connection.release(); // Release the connection back to the pool
    }
});

// Reaging endpoint
router.post('/reaging', validateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return respondWithJSON(res, { message: MESSAGES.UPLOAD_FAILED }, 400);
        }

        console.log(req.file)

        const result = await connectML(req.file.buffer);
        if (!result || result.length === 0) {
            throw new Error("Data from connectML is empty or undefined");
        }
        console.log("result reaging: ");
	console.log(result);    
        respondWithImage(res, result, req.file.mimetype);
    } catch (error) {
        console.error("Error in reaging route:", error.message);
        respondWithJSON(res, { message: MESSAGES.PROCESSING_ERROR }, 500);
    }
});

router.get('/admin_dashboard', validateToken, validateAdmin, (req, res) => {
    let connection;
    // Your code to handle admin-specific tasks
    respondWithJSON(res, { message: "Welcome to the admin dashboard" });
});

module.exports = router;
