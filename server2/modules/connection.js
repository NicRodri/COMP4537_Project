const pool = require('./dbConfig');

async function initializeDB() {
    try {
        // Get a connection from the pool
        const connection = await pool.getConnection();

        // Create token_blacklist table
        const createTokenBlacklistTableQuery = `
            CREATE TABLE IF NOT EXISTS token_blacklist (
                id INT PRIMARY KEY AUTO_INCREMENT,
                token VARCHAR(500) NOT NULL,
                expiry TIMESTAMP NOT NULL
            );
        `;
        await connection.query(createTokenBlacklistTableQuery);

        // Create users table
        const createUserTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                user_type ENUM('admin', 'user') DEFAULT 'user'
            );
        `;
        await connection.query(createUserTableQuery);

        // Release the connection back to the pool
        connection.release();

        console.log('Database initialized and tables created if they did not exist');
    } catch (err) {
        console.error("Error connecting to the database or creating tables:", err);
        throw err;
    }
}

module.exports = initializeDB;
