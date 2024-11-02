require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    user: process.env.DB_USER || 'Hikari',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'isa_project',
    host: process.env.DB_HOST || null,
    port: process.env.DB_HOST ? '3306' : null,
    socketPath: process.env.DB_HOST ? null : '/run/mysqld/mysqld.sock',
    
    // Pool settings
    waitForConnections: true,
    connectionLimit: 10,       // Max connections in pool
    maxIdle: 60000,            // Idle timeout in ms (1 minute)
    maxLifetime: 300000,       // Max lifetime of a connection in ms (5 minutes)
    queueLimit: 0              // No limit on queued requests
});

module.exports = pool;
