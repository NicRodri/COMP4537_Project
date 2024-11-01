const mysql = require('mysql2/promise');
const dbConfig = require('./dbConfig');

async function initializeDB() {
    try {
        // Create a connection using async/await
        const connection = await mysql.createConnection(dbConfig);
        // console.log("Connected to the 'isa_project' database.");

        // Create token_blacklist table
        const createTokenBlacklistTableQuery = `
            CREATE TABLE IF NOT EXISTS token_blacklist (
                id INT PRIMARY KEY AUTO_INCREMENT,
                token VARCHAR(500) NOT NULL,
                expiry TIMESTAMP NOT NULL
            );
        `;

        await connection.query(createTokenBlacklistTableQuery);
        // console.log('Token blacklist table created or already exists');

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
        // console.log('Users table created or already exists');

        // Return the connection to use it in other parts of the app
        return connection;
    } catch (err) {
        console.error("Error connecting to the database or creating tables:", err);
        throw err;
    }
}

module.exports = initializeDB;

