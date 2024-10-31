// utils.js
const respondWithJSON = (res, data, statusCode = 200) => {
    res.status(statusCode).json(data);
};

const respondWithImage = (res, imageBuffer, contentType = 'image/png', statusCode = 200) => {
    res.status(statusCode)
       .set('Content-Type', contentType)
       .send(imageBuffer);
};

const setCorsMiddleware = (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
};

const parseCookies = (req) => {
    return req.cookies; // Express includes cookie-parser middleware
};

module.exports = { respondWithJSON, setCorsMiddleware, parseCookies, respondWithImage };