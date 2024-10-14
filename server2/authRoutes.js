const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // for session IDs
const initializeDB = require('./modules/connection'); // Import the connection module
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON, parseCookies} = require('./modules/utils');


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
                await connection.query(insertUserQuery, [username, email, hashedPassword, 'user']);

                // Create session for the new user
                const sessionId = uuidv4();
                const createdAt = new Date();
                const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_TIME);

                const sessionQuery = 'INSERT INTO sessions (session_id, user_id, created_at, expires_at) VALUES (?, LAST_INSERT_ID(), ?, ?)';
                await connection.query(sessionQuery, [sessionId, createdAt, expiresAt]);
                
                // Set session cookie in the response
                res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60}; Path=/`);

                respondWithJSON(res, { message: "User created successfully" }, 201);
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

                // Create new session for the user
                const sessionId = uuidv4();
                const createdAt = new Date();
                const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

                const sessionQuery = 'INSERT INTO sessions (session_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)';
                await connection.query(sessionQuery, [sessionId, user.id, createdAt, expiresAt]);

                // Set session cookie in the response
                res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60}; Path=/`);

                respondWithJSON(res, { message: "Login successful", user: { id: user.id, email: user.email, userType: user.user_type } }, 200);
            } catch (error) {
                respondWithJSON(res, { message: "Internal server error" }, 500);
            }
        } else {
            respondWithJSON(res, { message: "Method not allowed" }, 405);
        }
    }
    // Route handler to check if user is signed in
    async signedIn(req, res) {
        // Extract cookies from the request to retrieve the session ID
        const cookies = parseCookies(req); 
        const sessionId = cookies.session_id;

        if (!sessionId) {
            respondWithJSON(res, { message: "Not authenticated" }, 403);
            return;
        }

        try {
            // Query the sessions table to check if the session is valid and not expired
            const connection = await initializeDB();
            const sessionQuery = 'SELECT * FROM sessions WHERE session_id = ? AND expires_at > NOW()';
            const [sessionRows] = await connection.query(sessionQuery, [sessionId]);

            if (sessionRows.length === 0) {
                respondWithJSON(res, { message: "Session expired or invalid" }, 403);
                return;
            }

            // Fetch user details based on the user ID obtained from the session
            const userId = sessionRows[0].user_id;
            const userQuery = 'SELECT id, email, user_type FROM users WHERE id = ?';
            const [userRows] = await connection.query(userQuery, [userId]);

            if (userRows.length === 0) {
                respondWithJSON(res, { message: "User not found" }, 403);
                return;
            }
            
            // Respond with a success message and the user's information
            const user = userRows[0];
            respondWithJSON(res, {
                message: "Protected resource accessed",
                user: {
                    id: user.id,
                    email: user.email,
                    userType: user.user_type
                }
            }, 200);
        } catch (error) {
            respondWithJSON(res, { message: "Internal server error" }, 500);
        }
    }
    // Route handler for logging out
    async logout(req, res) {
        const cookies = parseCookies(req);
        const sessionId = cookies.session_id;

        if (!sessionId) {
            respondWithJSON(res, { message: "Not authenticated" }, 403);
            return;
        }

        try {
            // Delete the session from the database
            const connection = await initializeDB();
            const deleteQuery = 'DELETE FROM sessions WHERE session_id = ?';
            await connection.query(deleteQuery, [sessionId]);

            // Clear the session cookie
            res.setHeader('Set-Cookie', 'session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
            respondWithJSON(res, { message: "Logout successful" }, 200);
        } catch (error) {
            respondWithJSON(res, { message: "Internal server error" }, 500);
        }
    }

    registerRoutes() {
        this.router.addRoute('/register', this.createUser.bind(this));
        this.router.addRoute('/login', this.login.bind(this));
        this.router.addRoute('/signedin', this.signedIn.bind(this));
        this.router.addRoute('/logout', this.logout.bind(this));
    }
}

module.exports = AuthRoutes;
