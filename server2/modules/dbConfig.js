module.exports = {
    host: process.env.DB_HOST || '',
    user: process.env.DB_USER || 'Hikari',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lab5DB',
    socketPath: process.env.DB_SOCKET || '/run/mysqld/mysqld.sock'  // Add socketPath for Unix socket
};
