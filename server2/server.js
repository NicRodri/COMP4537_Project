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

class App {
    constructor(port) {
        this.port = port;
        this.router = new Router();
        this.setupRoutes();
        this.server = new Server(this.port, this.router);
    }

    setupRoutes() {
        // Define login route
        const loginRoute = async (req, res) => {
            if (req.method === 'POST') {
                let body = "";
                req.on("data", (chunk) => { body += chunk; });
                req.on("end", async () => {
                    try {
                        const { email, password } = JSON.parse(body);
                        console.log("Attempting login for email:", email);

                        const userQuery = 'SELECT * FROM users WHERE email = ?';

                        console.log("Executing query:", userQuery);
                        console.log("With parameter:", email);

                        // Fetch user by email
                        const connection = await initializeDB();
                        const [rows] = await connection.query(userQuery, [email]);
                        console.log("Raw query result:", rows);

                        if (rows.length === 0) {
                            console.log("No user found with this email");
                            respondWithJSON(res, { message: MESSAGES.INVALID_CREDENTIALS }, 401);
                            return;
                        }

                        const user = rows[0];
                        console.log("User object:", user);

                        if (!user.password) {
                            console.log("Password is undefined in the user object");
                            respondWithJSON(res, { message: MESSAGES.SERVER_ERROR }, 500);
                            return;
                        }

                        // Compare passwords
                        const isValidPassword = await bcrypt.compare(password, user.password);
                        console.log("Is password valid?", isValidPassword);

                        if (!isValidPassword) {
                            respondWithJSON(res, { message: MESSAGES.INVALID_CREDENTIALS }, 401);
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
                        console.error("Error during login:", error);
                        respondWithJSON(res, { message: "Internal Server Error" }, 500);
                    }
                });
            } else {
                res.writeHead(405, { 'Content-Type': 'text/html' });
                res.end(MESSAGES.INVALID_METHOD);
            }
        };

        // Define protected route
        const protectedRoute = async (req, res) => {
            // Get the Authorization header
            const authHeader = req.headers['authorization'];

            if (!authHeader) {
                respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
                return;
            }

            // Extract the token from the Authorization header
            const token = authHeader.split(' ')[1];  // Assuming the header format is 'Bearer <token>'

            if (!token) {
                respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
                return;
            }

            try {
                // Verify the JWT token
                const decoded = jwt.verify(token, SECRET_KEY);  // Decode and verify the token

                // At this point, the token is valid, and the user information is decoded.
                // decoded will contain the payload (e.g., userId, role, etc.)
                console.log('Decoded JWT:', decoded);

                // Optionally, you can fetch more user details from the database if necessary
                const userQuery = 'SELECT user_type FROM users WHERE id = ?';
                const connection = await initializeDB();
                const [userResult] = await connection.query(userQuery, [decoded.userId]);

                if (userResult.length === 0) {
                    respondWithJSON(res, { message: MESSAGES.NOT_AUTHENTICATED }, 403);
                    return;
                }

                // If user exists and token is valid, proceed with the request
                respondWithJSON(res, {
                    message: MESSAGES.SUCCESS_QUERY,
                    user_type: userResult[0].user_type // Include user_type in the response
                });

            } catch (error) {
                console.error("Error during JWT validation:", error);
                respondWithJSON(res, { message: "Invalid or expired token" }, 403);
            }
        };

        this.router.addRoute('/login', loginRoute);
        this.router.addRoute('/protected', protectedRoute);
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
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
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
