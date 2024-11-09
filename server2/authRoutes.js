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
        const { email, password } = req.body;
        const connection = await initializeDB();
        
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return respondWithJSON(res, { message: MESSAGES.INVALID_CREDENTIALS }, CONSTANTS.STATUS.UNAUTHORIZED);
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
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
        const connection = await initializeDB();
        const [userResult] = await connection.query(
            'SELECT user_type FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (userResult.length === 0) {
            return respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, CONSTANTS.STATUS.FORBIDDEN);
        }

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

        res.clearCookie('authToken');
        respondWithJSON(res, { message: MESSAGES.LOGOUT_SUCCESS });
    } catch (error) {
        respondWithJSON(res, { message: MESSAGES.INTERNAL_SERVER_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});

// Reaging endpoint
router.post('/reaging', validateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return respondWithJSON(res, { message: MESSAGES.UPLOAD_FAILED }, CONSTANTS.STATUS.BAD_REQUEST);
        }

        const result = await connectML(req.file.buffer);
        if (!result || result.length === 0) {
            throw new Error(MESSAGES.PROCESSING_ERROR);
        }

        respondWithImage(res, result, req.file.mimetype);
    } catch (error) {
        console.error("Error in reaging route:", error.message);
        respondWithJSON(res, { message: MESSAGES.PROCESSING_ERROR }, CONSTANTS.STATUS.INTERNAL_SERVER_ERROR);
    }
});

module.exports = router;