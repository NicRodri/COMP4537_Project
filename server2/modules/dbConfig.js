// dbConfig.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const poolConfig = {
    user: process.env.DB_USER || 'Hikari',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'isa_project',
    waitForConnections: true,
    connectionLimit: 10, // Adjust the limit as per your needs
    idleTimeout: 10,           
    queueLimit: 0
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
