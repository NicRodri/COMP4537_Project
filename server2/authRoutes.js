const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // for session IDs
const initializeDB = require('./modules/connection'); // Import the connection module
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON, parseCookies } = require('./modules/utils');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your-secret-key';
const cookie = require('cookie');
const connectML = require('./modules/connectML');

const multer = require('multer');
const path = require('path');

// Set up multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(), // Store the image in memory as a buffer
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"), false);
        }
    }
});

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

                const cookieString = cookie.serialize('authToken', token, {
                    httpOnly: true,  // Prevents client-side access
                    secure: true,    // Ensures cookie is sent over HTTPS
                    maxAge: 60 * 60 * 24, // 1 day in seconds
                    path: '/',
                    sameSite: 'None' // Controls cross-site request behavior
                });

                res.setHeader('Set-Cookie', cookieString);

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

                const cookieString = cookie.serialize('authToken', token, {
                    httpOnly: true,  // Prevents client-side access
                    secure: true,    // Ensures cookie is sent over HTTPS
                    maxAge: 60 * 60 * 24, // 1 day in seconds
                    path: '/',
                    sameSite: 'None' // Controls cross-site request behavior
                });

                res.setHeader('Set-Cookie', cookieString);

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
        const authHeader = req.headers['cookie'];
        console.log(authHeader);

        if (!authHeader) {
            respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
            return;
        }

        const token = authHeader.split('=')[1];  // extracts the value from authheader
        // console.log(token);

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
            // Log decoded information for debugging
            console.log('Decoded JWT:', decoded);

            const userQuery = 'SELECT user_type FROM users WHERE id = ?';
            const connection = await initializeDB();
            const [userResult] = await connection.query(userQuery, [decoded.userId]);

            console.log('Decoded userId from token:', decoded.userId);

            if (userResult.length === 0) {
                console.log(MESSAGES.NOT_AUTHENTICATED )
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
        const authHeader = req.headers['cookie'];
        console.log(authHeader);

        if (!authHeader) {
            respondWithJSON(res, { message: "Not authenticated" }, 403);
            return;
        }

        // Extract the token from the Cookie header
        const token = authHeader.split('=')[1];  // extracts the value from authheader
        console.log(token);

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
    // Route handler for reaging the token
    // async reaging(req, res) {
    //     try {
    //         const authHeader = req.headers['cookie'];
    //         console.log("Auth Header:", authHeader);
    
    //         // Check if authorization header exists
    //         if (!authHeader) {
    //             respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
    //             return;
    //         }
    
    //         // Extract token from cookie
    //         const token = authHeader.split('=')[1];  // assumes format "token=value"
    //         if (!token) {
    //             respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
    //             return;
    //         }
    
    //         // Validate the token
    //         const { valid, decoded, message } = await this.validateToken(token);
    //         if (!valid) {
    //             respondWithJSON(res, { message }, 403);
    //             return;
    //         }
    
    //         // Attempt to retrieve data from connectML
    //         try {
    //             const result = await connectML.connectML();
    //             if (!result || !result.data) {
    //                 throw new Error("Data from connectML is empty or undefined");
    //             }
    //             respondWithJSON(res, { result: result.data }, 200);
    //         } catch (err) {
    //             console.error("Error connecting to ML service:", err.message);
    //             respondWithJSON(res, { message: "Error retrieving data from ML service" }, 500);
    //         }
    //     } catch (error) {
    //         console.error("Error in reaging route:", error.message);
    //         respondWithJSON(res, { message: "Internal Server Error" }, 500);
    //     }
    // }
    async reaging(req, res) {
        try {
            // Extract and validate auth token from cookies
            const authHeader = req.headers['cookie'];
            if (!authHeader) {
                return respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
            }
    
            // Parse token from cookie header (assuming format "authToken=value")
            const token = authHeader.split('=')[1];
            const { valid, decoded, message } = await this.validateToken(token);
            if (!valid) {
                return respondWithJSON(res, { message }, 403);
            }
    
            // Verify the file exists in the request
            if (!req.file) {
                return respondWithJSON(res, { message: MESSAGES.UPLOAD_FAILED }, 400);
            }
    
            // Process the uploaded image with ML service
            try {
                const result = await connectML(req.file.buffer); // Passing image buffer to connectML
                if (!result || !result.data) {
                    throw new Error("Data from connectML is empty or undefined");
                }
    
                // Successful response with the ML processing result
                respondWithJSON(res, { result: result.data }, 200);
            } catch (err) {
                console.error("Error processing the image:", err.message);
                respondWithJSON(res, { message: MESSAGES.PROCESSING_ERROR }, 500);
            }
        } catch (error) {
            console.error("Error in reaging route:", error.message);
            respondWithJSON(res, { message: "Internal Server Error" }, 500);
        }
    }
    



    registerRoutes() {
        this.router.addRoute('/register', this.createUser.bind(this));
        this.router.addRoute('/login', this.login.bind(this));
        this.router.addRoute('/signedin', this.signedIn.bind(this));
        this.router.addRoute('/logout', this.logout.bind(this));
        this.router.addRoute('/reaging', this.reaging.bind(this));
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
