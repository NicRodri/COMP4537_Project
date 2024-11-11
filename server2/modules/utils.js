require('dotenv').config();
const { CONSTANTS } = require('../lang/messages/en/constants');
const { MESSAGES } = require('../lang/messages/en/user');
const CLIENT_URL = process.env.CORS_URL;

const respondWithJSON = (res, data, statusCode = CONSTANTS.STATUS.SUCCESS) => {
    res.status(statusCode).json(data);
};

const respondWithImage = (res, imageBuffer, contentType = MESSAGES.DEFAULT_IMAGE_TYPE, statusCode = CONSTANTS.STATUS.SUCCESS) => {
    res.status(statusCode)
       .set('Content-Type', contentType)
       .send(imageBuffer);
};

const setCorsMiddleware = (req, res, next) => {
    res.header("Access-Control-Allow-Origin", CLIENT_URL);
    res.header("Access-Control-Allow-Credentials", MESSAGES.ALLOW_CREDENTIALS);
    res.header("Access-Control-Allow-Methods", MESSAGES.ALLOW_METHODS);
    res.header("Access-Control-Allow-Headers", `${MESSAGES.ALLOW_HEADERS}, X-Alert`); // Allow custom headers
    res.header("Access-Control-Expose-Headers", "X-Alert"); // Expose custom headers to the client

    if (req.method === MESSAGES.OPTIONS_METHOD) {
        return res.status(CONSTANTS.STATUS.SUCCESS).end();
    }
    next();
};

const parseCookies = (req) => {
    return req.cookies; // Express includes cookie-parser middleware
};

module.exports = { respondWithJSON, setCorsMiddleware, parseCookies, respondWithImage };
