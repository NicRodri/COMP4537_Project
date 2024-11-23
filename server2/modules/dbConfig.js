require('dotenv').config();
const mysql = require('mysql2/promise');
const { CONSTANTS } = require('../lang/messages/en/constants');
const { MESSAGES } = require('../lang/messages/en/user');

const poolConfig = {
    user: process.env.DB_USER || 'Hikari',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'isa_project',
    waitForConnections: true,
    connectionLimit: CONSTANTS.CONNECTION_LIMIT,
    idleTimeout: CONSTANTS.IDLE_TIMEOUT, 
    queueLimit: CONSTANTS.QUEUE_LIMIT,
    enableKeepAlive: CONSTANTS.ENABLE_KEEP_ALIVE,
    keepAliveInitialDelay: CONSTANTS.KEEP_ALIVE_INITIAL_DELAY,
};

// Use the host if defined, otherwise use the socketPath if available
if (process.env.DB_HOST) {
    poolConfig.host = process.env.DB_HOST;
    poolConfig.port = process.env.DB_PORT || CONSTANTS.DB_PORT;
} else {
    poolConfig.socketPath = MESSAGES.SOCKET_PATH;
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
