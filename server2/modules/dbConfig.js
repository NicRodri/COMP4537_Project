require('dotenv').config();

const connectionConfig = {
    user: process.env.DB_USER || 'Hikari',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'isa_project'
};

// Use the host if defined, otherwise use the socketPath if available
if (process.env.DB_HOST) {
    connectionConfig.host = process.env.DB_HOST;
    connectionConfig.port = '3306';
} else if (process.env.DB_SOCKET) {
    connectionConfig.socketPath = '/run/mysqld/mysqld.sock' ;
}

module.exports = connectionConfig;

