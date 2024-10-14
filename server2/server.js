const http = require('http');
const url = require('url');
const db = require('./modules/connection');
const { MESSAGES } = require('./lang/messages/en/user');
const { respondWithJSON } = require('./modules/utils');

const SQL_QUERY_PATH = 'api/v1/sql';
const PORT = 6000;

class App {
    constructor(port) {
        this.port = port;
        this.router = new Router();
        this.setupRoutes();
        this.server = new Server(this.port, this.router);
    }

    setupRoutes() {
        const definitionsRoute = (req, res) => {
            // Set CORS headers for every request. Did not work for me until I changed to this format.
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");

            // Handle CORS preflight request
            if (req.method === "OPTIONS") {
                res.writeHead(200); // Send 200 OK for preflight
                res.end(); 
                return;
            }
            // Handle the Post requests.
            if (req.method === "POST") {  
                let body = "";
                req.on("data",  (chunk) => {
                    body += chunk;
                });
    
                req.on("end", () => { // GPT assisted in some of this code
                    try {
                        // Parse the incoming JSON body
                        const { sqlQuery } = JSON.parse(body);  // Expecting a field named `sql`
                        
                        // Check if the `sql` field is provided in the request
                        if (sqlQuery) {
                            // Execute the SQL query directly
                            db.query(sqlQuery, (err, result) => {
                                if (err) {
                                    respondWithJSON(res, { message: err.message }, 500);
                                    return;
                                }
                                respondWithJSON(res, { message: MESSAGES.SUCCESS_QUERY, sqlQuery, result });
                            });
                        // These two are only really relevant if you are sending through postman since the json format would be fine otherwise
                        } else {
                            respondWithJSON(res, { message: MESSAGES.INVALID_INPUT}, 400);
                        }
                    } catch (error) {
                        respondWithJSON(res, { message: MESSAGES.INVALID_FORMAT }, 400);
                    }
                });
            } else if (req.method === "GET") {
                    //GPT helped with the logic
                    // Parse the query string for SQL query
                    const url = new URL(req.url, `https://${req.headers.host}`);
                    const sqlQuery = url.searchParams.get('sqlQuery'); // Extract `sqlQuery` from the query string

                    if (sqlQuery) {
                        // Execute the SQL query
                        db.query(sqlQuery, (err, result) => {
                            if (err) {
                                respondWithJSON(res, { message: err.message }, 500);
                                return;
                            }
                            respondWithJSON(res, { message: MESSAGES.SUCCESS_QUERY, sqlQuery, result });
                        });
                    } else {
                        // Return an error if `sqlQuery` is not present in the query string
                        respondWithJSON(res, { message: MESSAGES.EMPTY_QUERY}, 400);
                    }
            } else {
                res.writeHead(405, { "Content-Type": "text/html" });
                res.end(MESSAGES.INVALID_METHOD);
            }
        };

        // regular expression added so api works both with and without /
        // Could alternatively separate into two routes as well if needed.
        this.router.addRoute(`/${SQL_QUERY_PATH}(/.*)?`, definitionsRoute);
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
        const server = http.createServer((req, res) => this.router.handle(req, res));
        server.listen(this.port, () => {
            console.log(`listening on port ${this.port}`)
        });
    }
}

class Router {
    constructor() {
        this.routes = [];
    }

    addRoute(path, handler) {
        // Convert string path to a regular expression
        const pathRegex = new RegExp(`^${path.replace(/\/$/, '')}/?$`); // ChatGPT helped with this logic
        this.routes.push({ pattern: pathRegex, handler });
    }

    // Handle the incoming requests by matching against registered patterns
    handle(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;

        // Iterate through all registered routes and find a match using regex
        for (const route of this.routes) {
            if (route.pattern.test(path)) {
                route.handler(req, res, parsedUrl.query);
                return;
            }
        }

        // If no routes match, return 404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(MESSAGES.NOT_FOUND);
    }
}

const app = new App(PORT);
app.start();