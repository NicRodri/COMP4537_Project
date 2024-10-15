function respondWithJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
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
    // const allowedOrigin = req.headers.origin; // Get the origin of the request
    // console.log(allowedOrigin)

    res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500"); // Set the specific origin
    res.setHeader("Access-Control-Allow-Credentials", "true"); // Allow sending cookies cross-origin
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

module.exports = { respondWithJSON, parseCookies, setCorsHeaders };