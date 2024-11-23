// authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { MESSAGES } = require('./lang/messages/en/user');
const { CONSTANTS } = require('./lang/messages/en/constants');
const { respondWithJSON, respondWithImage } = require('./modules/utils');
const initializeDB = require('./modules/connection');
const {connectML} = require('./modules/connectML');
const pool = require('./modules/dbConfig');
const {incrementEndpointUsage} = require('./modules/endpoint_increment');
const {incrementUserApiCalls} = require('./modules/incrementUserApiCalls');


const SECRET_KEY = 'your-secret-key';

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error(MESSAGES.UPLOAD_FAILED), false);
        }
    }
});

// Middleware to validate JWT token
const validateToken = async (req, res, next) => {
    const token = req.cookies.authToken;
    
    if (!token) {
        return respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, CONSTANTS.STATUS.FORBIDDEN);
    }

    try {
        const connection = await initializeDB();
        const [blacklistedToken] = await connection.query(
            'SELECT * FROM token_blacklist WHERE token = ?',
            [token]
        );

        if (blacklistedToken.length > 0) {
            return respondWithJSON(res, { message: MESSAGES.TOKEN_BLACKLISTED }, CONSTANTS.STATUS.FORBIDDEN);
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return respondWithJSON(res, { message: MESSAGES.TOKEN_EXPIRED }, CONSTANTS.STATUS.FORBIDDEN);
        }
        return respondWithJSON(res, { message: MESSAGES.INVALID_TOKEN }, CONSTANTS.STATUS.FORBIDDEN);
    }
};

const validateAdmin = (req, res, next) => {
    if (req.user.role === "admin") {
        next();  // If the user is an admin, proceed to the route
    } else {
        res.redirect('/index.html'); // Redirect to index.html if not authorized
    }
};

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return respondWithJSON(res, { message: MESSAGES.ALL_FIELDS_REQUIRED }, CONSTANTS.STATUS.BAD_REQUEST);
        }

        const connection = await initializeDB();

        // Check existing user
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return respondWithJSON(res, { message: MESSAGES.EMAIL_USERNAME_EXISTS }, CONSTANTS.STATUS.CONFLICT);
        }

        const hashedPassword = await bcrypt.hash(password, CONSTANTS.SALT_ROUNDS);

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
            { expiresIn: CONSTANTS.JWT_EXPIRATION }
        );

        res.cookie('authToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: CONSTANTS.COOKIE_MAX_AGE,
            path: '/',
            sameSite: 'None'
        });

        incrementEndpointUsage('/register', 'POST');

        respondWithJSON(res, {
            message: `${MESSAGES.LOGIN_SUCCESS} and ${MESSAGES.REGISTER_SUCCESS}`,
            token,
            user: {
                id: newUser[0].id,
                email: newUser[0].email,
                userType: newUser[0].user_type
            }
        }, CONSTANTS.STATUS.CREATED);
    } catch (error) {
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        // console.log("Login route hit");
        const { email, password } = req.body;
        const connection = await initializeDB();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // console.log("No user found");
            return respondWithJSON(res, { message: MESSAGES.INVALID_CREDENTIALS }, CONSTANTS.STATUS.UNAUTHORIZED);
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            // console.log("Invalid password");
            return respondWithJSON(res, { message: MESSAGES.INVALID_CREDENTIALS }, CONSTANTS.STATUS.UNAUTHORIZED);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.user_type },
            SECRET_KEY,
            { expiresIn: CONSTANTS.JWT_EXPIRATION }
        );

        res.cookie('authToken', token, {
            httpOnly: true,
            secure: true,
            maxAge: CONSTANTS.COOKIE_MAX_AGE,
            path: '/',
            sameSite: 'None'
        });
        // console.log("Login successful");
        incrementEndpointUsage('/login', 'POST');
        // console.log("Incremented usage for /login POST");

        respondWithJSON(res, {
            message: MESSAGES.LOGIN_SUCCESS,
            token,
            user: {
                id: user.id,
                email: user.email,
                userType: user.user_type
            }
        });
    } catch (error) {
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});

// Check if signed in
router.post('/signedin', validateToken, async (req, res) => {
    try {
        // console.log(req.user);
        const connection = await initializeDB();
        const [userResult] = await connection.query(
            'SELECT user_type FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (userResult.length === 0) {
            return respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, CONSTANTS.STATUS.FORBIDDEN);
        }
        incrementEndpointUsage('/signedin', 'POST');


        respondWithJSON(res, {
            message: MESSAGES.SUCCESS_QUERY,
            user_type: userResult[0].user_type
        });

    } catch (error) {
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});

// Logout
router.get('/logout', validateToken, async (req, res) => {
    try {
        const token = req.cookies.authToken;
        const connection = await initializeDB();
        
        const decoded = jwt.decode(token);
        const expiryDate = new Date(decoded.exp * 1000);

        await connection.query(
            'INSERT INTO token_blacklist (token, expiry) VALUES (?, ?)',
            [token, expiryDate]
        );

        incrementEndpointUsage('/logout', 'GET');

        res.clearCookie('authToken');
        respondWithJSON(res, { message: MESSAGES.LOGOUT_SUCCESS });
    } catch (error) {
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }

});

// Reaging endpoint
router.post('/reaging', validateToken, upload.single('image'), async (req, res) => {
    try {
        const shouldAlertUser = await incrementUserApiCalls(req.user.userId);

        if (!req.file) {
            return respondWithJSON(res, { message: MESSAGES.UPLOAD_FAILED }, CONSTANTS.STATUS.BAD_REQUEST);
        }

        const authToken = req.cookies.authToken;
        const result = await connectML(req.file.buffer, authToken);

        if (!result || result.length === 0) {
            throw new Error(MESSAGES.PROCESSING_ERROR);
        }

        await incrementEndpointUsage('/reaging', 'POST');

        // Set a custom header if the user has exceeded 20 API calls
        if (shouldAlertUser) {
            // console.log("User has exceeded 20 API calls");
            res.setHeader('X-Alert', 'You have exceeded 20 API calls.');
        }

        res.contentType(req.file.mimetype).send(result); // Send the image as a Blob
    } catch (error) {
        console.error("Error in reaging route:", error.message);
        respondWithJSON(res, { message: MESSAGES.PROCESSING_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});


router.post('/admin_dashboard', validateToken, validateAdmin, (req, res) => {
    respondWithJSON(res, { message: "Welcome to the admin dashboard" });
});

// Separate route to get usage data
router.get('/get_usage_data', validateToken, validateAdmin, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const query = `
            SELECT endpoint, method, served_count
            FROM endpoint_usage
            ORDER BY endpoint, method;
        `;
        const [rows] = await connection.query(query);
        connection.release();

        res.json(rows);  // Respond with usage data as an array
        incrementEndpointUsage('/get_usage_data', 'GET');
    } catch (err) {
        console.error("Error retrieving usage data:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/get_user_api_calls', validateToken, validateAdmin, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Query to get user information along with API call counts
        const query = `
            SELECT u.id, u.username, u.email, u.user_type, COALESCE(ua.api_call_count, 0) AS api_call_count
            FROM users u
            LEFT JOIN user_api_calls ua ON u.id = ua.user_id
            ORDER BY u.username;
        `;

        incrementEndpointUsage('/get_user_api_calls', 'GET');

        const [rows] = await connection.query(query);
        connection.release();

        res.json(rows);  // Respond with user data including API call counts
    } catch (err) {
        console.error("Error retrieving user API call counts:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user route
router.delete('/delete_user/:id', validateToken, validateAdmin, async (req, res) => {
    try {
        const userId = req.params.id; // Get user ID from the route parameter

        if (!userId) {
            return respondWithJSON(res, { message: MESSAGES.USER_ID_REQUIRED }, CONSTANTS.STATUS.BAD_REQUEST);
        }

        const connection = await initializeDB();

        // Check if the user exists
        const [user] = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return respondWithJSON(res, { message: MESSAGES.USER_NOT_FOUND }, CONSTANTS.STATUS.NOT_FOUND);
        }

        // Delete the user
        await connection.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        incrementEndpointUsage('/delete_user', 'DELETE');

        respondWithJSON(res, {
            message: `${MESSAGES.USER_DELETED_SUCCESS} (User ID: ${userId})`
        }, CONSTANTS.STATUS.OK);
    } catch (error) {
        console.error("Error in delete_user route:", error.message);
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});

router.patch('/update_user_role/:id', validateToken, validateAdmin, async (req, res) => {
    try {
        const userId = req.params.id; // Get the user ID from the URL parameter
        const { role } = req.body;   // Get the new role from the request body

        // Validate input
        if (!userId || !role) {
            return respondWithJSON(res, { message: MESSAGES.ALL_FIELDS_REQUIRED }, CONSTANTS.STATUS.BAD_REQUEST);
        }

        // Only allow certain roles to be updated
        if (!['admin', 'user'].includes(role)) {
            return respondWithJSON(res, { message: MESSAGES.INVALID_ROLE }, CONSTANTS.STATUS.BAD_REQUEST);
        }

        const connection = await initializeDB();

        // Check if the user exists
        const [user] = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return respondWithJSON(res, { message: MESSAGES.USER_NOT_FOUND }, CONSTANTS.STATUS.NOT_FOUND);
        }

        // Update the user's role
        await connection.query(
            'UPDATE users SET user_type = ? WHERE id = ?',
            [role, userId]
        );

        incrementEndpointUsage('/update_user_role', 'PATCH');

        respondWithJSON(res, { message: `${MESSAGES.USER_ROLE_UPDATED} (User ID: ${userId}, Role: ${role})` }, CONSTANTS.STATUS.OK);
    } catch (error) {
        console.error("Error updating user role:", error.message);
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});



module.exports = router;