const http = require('http');
const url = require('url');
const AuthRoutes = require('./authRoutes');

const initializeDB = require('./modules/connection'); // Import the connection module
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON, parseCookies, setCorsHeaders } = require('./modules/utils');

// const SQL_QUERY_PATH = 'api/v1/sql';
const PORT = 8080;

class App {
    constructor(port) {
        this.port = port;
        this.router = new Router();
        this.authRoutes = new AuthRoutes(this.router);
        this.setupRoutes();
        this.server = new Server(this.port, this.router);
    }

    setupRoutes() {        
        this.authRoutes.registerRoutes();
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

// Start the app
const app = new App(PORT);
app.start();



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