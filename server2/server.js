const http = require('http');
const url = require('url');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // for session IDs
const initializeDB = require('./modules/connection'); // Import the connection module
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON } = require('./modules/utils');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your-secret-key';

const SQL_QUERY_PATH = 'api/v1/sql';
const PORT = 6000;
const saltRounds = 12;  // for bcrypt
const SESSION_EXPIRATION_TIME = 1 * 60 * 60 * 1000; // 1 hour

// async function createUser(username, email, password, userType = 'user') {
//     try {
//         // Hash the password using bcrypt
//         const hashedPassword = await bcrypt.hash(password, saltRounds);

//         // SQL query to insert the user into the database
//         const insertQuery = INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?);

//         // Execute the query
//         await db.query(insertQuery, [username, email, hashedPassword, userType]);

//         console.log(User ${username} created successfully!);
//     } catch (error) {
//         console.error('Error creating user:', error);
//     }
// }

// // Usage Example
// createUser('adminUser', 'admin@example.com', 'adminpassword', 'admin');
// createUser('regularUser', 'user@example.com', 'userpassword', 'user');

class App {
    constructor(port) {
        this.port = port;
        this.router = new Router();
        this.setupRoutes();
        this.server = new Server(this.port, this.router);
    }

    setupRoutes() {
        const createUserRoute = async (req, res) => {
            if (req.method === 'POST') {
                let body = "";
                req.on("data", (chunk) => { body += chunk; });
                req.on("end", async () => {
                    try {
                        // Parse the request body
                        const { username, email, password } = JSON.parse(body);

                        // Input validation
                        if (!username || !email || !password) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "All fields are required" }));
                            return;
                        }

                        // Additional validation (e.g., email format, password strength) can be added here

                        // Initialize DB connection
                        const connection = await initializeDB();

                        // Check if the email or username already exists
                        const checkUserQuery = 'SELECT id FROM users WHERE email = ? OR username = ?';
                        const [existingUsers] = await connection.query(checkUserQuery, [email, username]);

                        if (existingUsers.length > 0) {
                            res.writeHead(409, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "Email or username already exists" }));
                            return;
                        }

                        // Hash the password using bcrypt
                        const hashedPassword = await bcrypt.hash(password, saltRounds);

                        // Insert the new user into the database
                        const insertUserQuery = 'INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)';
                        await connection.query(insertUserQuery, [username, email, hashedPassword, 'user']);

                        // Optionally, log the user in immediately after registration
                        // Generate session ID and CSRF token
                        const sessionId = uuidv4();
                        const createdAt = new Date();
                        const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_TIME);

                        // Save the session in the database
                        const sessionQuery = 'INSERT INTO sessions (session_id, user_id, created_at, expires_at) VALUES (?, LAST_INSERT_ID(), ?, ?)';
                        await connection.query(sessionQuery, [sessionId, createdAt, expiresAt]);

                        // Set the session cookie with secure attributes
                        res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60}; Path=/`);

                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "User created successfully"}));
                    } catch (error) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Internal server error" }));
                    }
                });
            } else {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Method not allowed" }));
            }
        };

        // Define login route
        const loginRoute = async (req, res) => {
            if (req.method === 'POST') {
                let body = "";
                req.on("data", (chunk) => { body += chunk; });
                req.on("end", async () => {
                    try {
                        const { email, password } = JSON.parse(body);
                        const userQuery = 'SELECT * FROM users WHERE email = ?';
                        const connection = await initializeDB();
                        const [rows] = await connection.query(userQuery, [email]);

                        if (rows.length === 0) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "Invalid credentials" }));
                            return;
                        }

                        const user = rows[0];
                        const isValidPassword = await bcrypt.compare(password, user.password);

                        if (!isValidPassword) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "Invalid credentials" }));
                            return;
                        }

                        // Create a new session
                        const sessionId = uuidv4(); // Generate unique session ID
                        const createdAt = new Date(); // Timestamp for session creation
                        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiration

                        // Save the session in the database
                        // Insert into the sessions table following your table structure
                        const sessionQuery = 'INSERT INTO sessions (session_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)';
                        await connection.query(sessionQuery, [sessionId, user.id, createdAt, expiresAt]);

                        // Set the session cookie
                        // Set the session cookie with SameSite attribute
                        res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60}; Path=/`);


                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Login successful", user: { id: user.id, email: user.email, userType: user.user_type } }));
                    } catch (error) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Internal server error" }));
                    }
                });
            } else {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Method not allowed" }));
            }
        };

        // Define protected route
        const protectedRoute = async (req, res) => {
            const cookies = parseCookies(req);  // Parse cookies from the request
            const sessionId = cookies.session_id;  // Retrieve the session ID from the cookie

            if (!sessionId) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Not authenticated" }));
                return;
            }

            try {
                const connection = await initializeDB();
                const sessionQuery = 'SELECT * FROM sessions WHERE session_id = ? AND expires_at > NOW()';
                const [sessionRows] = await connection.query(sessionQuery, [sessionId]);

                if (sessionRows.length === 0) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "Session expired or invalid" }));
                    return;
                }

                // Parse session data
                // Instead of parsing session data, directly use the user_id from the session row
                const userId = sessionRows[0].user_id;

                // Optionally, fetch additional user details if necessary
                const userQuery = 'SELECT id, email, user_type FROM users WHERE id = ?';
                const [userRows] = await connection.query(userQuery, [userId]);

                if (userRows.length === 0) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "User not found" }));
                    return;
                }

                // Respond with the user details
                const user = userRows[0];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: "Protected resource accessed",
                    user: {
                        id: user.id,
                        email: user.email,
                        userType: user.user_type
                    }
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Internal server error" }));
            }
        };

        const logoutRoute = async (req, res) => {
            const cookies = parseCookies(req);
            const sessionId = cookies.session_id;

            if (!sessionId) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Not authenticated" }));
                return;
            }

            try {
                const connection = await initializeDB();
                const deleteQuery = 'DELETE FROM sessions WHERE session_id = ?';
                await connection.query(deleteQuery, [sessionId]);

                // Clear the session cookie with SameSite attribute and Max-Age=0
                res.setHeader('Set-Cookie', 'session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Logout successful" }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Internal server error" }));
            }
        };
        this.router.addRoute('/register', createUserRoute);

        this.router.addRoute('/login', loginRoute);
        this.router.addRoute('/protected', protectedRoute);
        this.router.addRoute('/logout', logoutRoute);
    }

    start() {
        this.server.start();
    }
}

class Server {
    constructor(port, router) {
        this.port = port;
        this.router = router;
    }

    start() {
        const server = http.createServer((req, res) => {
            setCorsHeaders(req, res, () => {
                this.router.handle(req, res);
            });
        });

        server.listen(this.port, () => {
            console.log(`listening on port ${this.port}`);
        });
    }
}

class Router {
    constructor() {
        this.routes = [];
    }

    addRoute(path, handler) {
        const pathRegex = new RegExp(`^${path.replace(/\/$/, '')}/?$`);
        this.routes.push({ pattern: pathRegex, handler });
    }

    handle(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;

        for (const route of this.routes) {
            if (route.pattern.test(path)) {
                route.handler(req, res, parsedUrl.query);
                return;
            }
        }

        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(MESSAGES.NOT_FOUND);
    }
}

// Helper function to parse cookies
function parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;

    rc && rc.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function setCorsHeaders(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true"); // This allows sending cookies cross-origin
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
        res.writeHead(200); // Send 200 OK for preflight
        res.end();
        return;
    }

    next(); // Pass the request to the next middleware or route handler
}

// Start the app
const app = new App(PORT);
app.start();
