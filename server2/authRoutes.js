const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // for session IDs
const initializeDB = require('./modules/connection'); // Import the connection module
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON, parseCookies } = require('./modules/utils');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your-secret-key';


const saltRounds = 12;  // for bcrypt
const SESSION_EXPIRATION_TIME = 1 * 60 * 60 * 1000; // 1 hour

class AuthRoutes {
    constructor(router) {
        this.router = router;
    }

    // Helper method to parse request body
    parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // Route handler for user registration
    async createUser(req, res) {
        if (req.method === 'POST') {
            try {
                const { username, email, password } = await this.parseRequestBody(req);

                // Input validation
                if (!username || !email || !password) {
                    respondWithJSON(res, { message: "All fields are required" }, 400);
                    return;
                }

                const connection = await initializeDB();

                // Check if the email or username already exists
                const checkUserQuery = 'SELECT id FROM users WHERE email = ? OR username = ?';
                const [existingUsers] = await connection.query(checkUserQuery, [email, username]);

                if (existingUsers.length > 0) {
                    respondWithJSON(res, { message: "Email or username already exists" }, 409);
                    return;
                }

                // Hash the user's password before saving
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Insert new user into the database
                const insertUserQuery = 'INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)';
                const [result] = await connection.query(insertUserQuery, [username, email, hashedPassword, 'user']);

                // Retrieve the newly inserted user's ID
                const newUserQuery = 'SELECT id, email, user_type FROM users WHERE id = ?';
                const [newUser] = await connection.query(newUserQuery, [result.insertId]);

                if (!newUser.length) {
                    respondWithJSON(res, { message: "User not found after insertion" }, 500);
                    return;
                }

                const user = newUser[0];

                // On successful login, generate JWT
                const token = jwt.sign(
                    { userId: user.id, email: user.email, role: user.user_type },
                    SECRET_KEY,
                    { expiresIn: '1h' }  // Token expires in 1 hour
                );
                console.log("JWT generated");

                // Send JWT to client (as part of JSON response)
                respondWithJSON(res, {
                    message: "Login successful and User created successfully",
                    token: token,  // Send JWT token to client
                    user: {
                        id: user.id,
                        email: user.email,
                        userType: user.user_type
                    }
                }, 201);

            } catch (error) {
                respondWithJSON(res, { message: "Internal server error" }, 500);
            }
        } else {
            respondWithJSON(res, { message: "Method not allowed" }, 405);
        }
    }

    // Route handler for user login
    async login(req, res) {
        if (req.method === 'POST') {
            try {
                // Fetch user by email
                const { email, password } = await this.parseRequestBody(req);
                const connection = await initializeDB();
                const userQuery = 'SELECT * FROM users WHERE email = ?';
                const [rows] = await connection.query(userQuery, [email]);

                if (rows.length === 0) {
                    respondWithJSON(res, { message: "Invalid credentials" }, 401);
                    return;
                }

                // Compare input password with stored hashed password
                const user = rows[0];
                const isValidPassword = await bcrypt.compare(password, user.password);

                if (!isValidPassword) {
                    respondWithJSON(res, { message: "Invalid credentials" }, 401);
                    return;
                }

                // On successful login, generate JWT
                const token = jwt.sign(
                    { userId: user.id, email: user.email, role: user.user_type },
                    SECRET_KEY,
                    { expiresIn: '1h' }  // Token expires in 1 hour
                );
                console.log("JWT generated");

                // Send JWT to client (as part of JSON response)
                respondWithJSON(res, {
                    message: "Login successful",
                    token: token,  // Send JWT token to client
                    user: {
                        id: user.id,
                        email: user.email,
                        userType: user.user_type
                    }
                }, 200);
            } catch (error) {
                respondWithJSON(res, { message: "Internal server error" }, 500);
            }
        } else {
            respondWithJSON(res, { message: "Method not allowed" }, 405);
        }
    }
    // Route handler to check if user is signed in
    async signedIn(req, res) {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
            return;
        }

        const token = authHeader.split(' ')[1];  // Assuming the header format is 'Bearer <token>'

        if (!token) {
            respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
            return;
        }

        const { valid, decoded, message } = await this.validateToken(token);
        if (!valid) {
            respondWithJSON(res, { message }, 403);
            return;
        }
        try {
            const decoded = jwt.verify(token, SECRET_KEY);

            // Log decoded information for debugging
            console.log('Decoded JWT:', decoded);

            const userQuery = 'SELECT user_type FROM users WHERE id = ?';
            const connection = await initializeDB();
            const [userResult] = await connection.query(userQuery, [decoded.userId]);

            if (userResult.length === 0) {
                respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
                return;
            }

            // User is authenticated, return success response
            respondWithJSON(res, {
                message: MESSAGES.SUCCESS_QUERY,
                user_type: userResult[0].user_type
            }, 200);

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                respondWithJSON(res, { message: "Token expired" }, 403);
            } else if (error.name === 'JsonWebTokenError') {
                respondWithJSON(res, { message: "Invalid token" }, 403);
            } else {
                console.error(error);  // Log the error
                respondWithJSON(res, { message: "Internal server error" }, 500);
            }
        }
    }
    // Route handler for logging out
    async logout(req, res) {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            respondWithJSON(res, { message: "Not authenticated" }, 403);
            return;
        }

        // Extract the token from the Authorization header
        const token = authHeader.split(' ')[1];  // Assuming 'Bearer <token>'

        if (!token) {
            respondWithJSON(res, { message: "Token missing or invalid" }, 403);
            return;
        }

        const { valid, decoded, message } = await this.validateToken(token);
        if (!valid) {
            respondWithJSON(res, { message }, 403);
            return;
        }

        try {
            // Verify the JWT token
            const decoded = jwt.verify(token, SECRET_KEY);

            // Get the expiry date of the token from its decoded payload (exp is in seconds)
            const expiryDate = new Date(decoded.exp * 1000);  // Convert to milliseconds

            // Insert the token into the blacklist
            const connection = await initializeDB();
            const insertBlacklistQuery = `
            INSERT INTO token_blacklist (token, expiry) 
            VALUES (?, ?)
        `;
            await connection.query(insertBlacklistQuery, [token, expiryDate]);

            // Close the database connection
            await connection.end();

            // Send a response indicating successful logout
            respondWithJSON(res, { message: "Logout successful" }, 200);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                respondWithJSON(res, { message: "Token expired" }, 403);
            } else if (error.name === 'JsonWebTokenError') {
                respondWithJSON(res, { message: "Invalid token" }, 403);
            } else {
                console.error(error);  // Log the error
                respondWithJSON(res, { message: "Internal server error" }, 500);
            }
        }
    }

    registerRoutes() {
        this.router.addRoute('/register', this.createUser.bind(this));
        this.router.addRoute('/login', this.login.bind(this));
        this.router.addRoute('/signedin', this.signedIn.bind(this));
        this.router.addRoute('/logout', this.logout.bind(this));
    }

    async validateToken(token) {
        if (!token) {
            return { valid: false, message: "Token missing or invalid" };
        }

        try {
            // Check if the token is blacklisted
            const connection = await initializeDB();
            const checkBlacklistQuery = 'SELECT * FROM token_blacklist WHERE token = ?';
            const [blacklistedToken] = await connection.query(checkBlacklistQuery, [token]);

            if (blacklistedToken.length > 0) {
                return { valid: false, message: "Token is blacklisted" };
            }

            // Verify the token
            const decoded = jwt.verify(token, SECRET_KEY);
            return { valid: true, decoded };  // Return true and the decoded token data
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { valid: false, message: "Token expired" };
            } else if (error.name === 'JsonWebTokenError') {
                return { valid: false, message: "Invalid token" };
            } else {
                console.error("Token validation error:", error);
                return { valid: false, message: "Internal server error" };
            }
        }
    }
    
}

module.exports = AuthRoutes;
