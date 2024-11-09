const CONSTANTS = {
    JWT_EXPIRATION: '1h',
    COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    SALT_ROUNDS: 12,
    STATUS: {
        SUCCESS: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500
    }
};

module.exports = { CONSTANTS };
