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
    },
    DB_PORT: 3306,
    CONNECTION_LIMIT: 10,
    IDLE_TIMEOUT: 60000, // 1 minute in milliseconds
    QUEUE_LIMIT: 0,
    ENABLE_KEEP_ALIVE: true,
    KEEP_ALIVE_INITIAL_DELAY: 0,
};

module.exports = { CONSTANTS };
