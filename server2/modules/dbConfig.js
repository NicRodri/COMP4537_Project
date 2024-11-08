// dbConfig.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const poolConfig = {
    user: process.env.DB_USER || 'Hikari',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'isa_project',
    waitForConnections: true,
    connectionLimit: 10,
    idleTimeout: 60000, // Set to 1 minute for clearer results
    queueLimit: 0,
    enableKeepAlive: true, // Ensures connections are reused
    keepAliveInitialDelay: 0, // Immediately sends keepalive packets
};

// Use the host if defined, otherwise use the socketPath if available
if (process.env.DB_HOST) {
    poolConfig.host = process.env.DB_HOST;
    poolConfig.port = '3306';
} else {
    poolConfig.socketPath = '/run/mysqld/mysqld.sock';
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
