// initializeDB.js
const pool = require('./dbConfig');

async function initializeDB() {
    try {
        // console.log("Connecting to the database and creating tables...");
        // Get a connection from the pool
        const connection = await pool.getConnection();
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

        const createUserApiCallsTableQuery = `
            CREATE TABLE IF NOT EXISTS user_api_calls (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                api_call_count INT DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `;
        await connection.query(createUserApiCallsTableQuery);

        const syncApiCallsTableQuery = `
        INSERT INTO user_api_calls (user_id, api_call_count)
        SELECT id, 0 FROM users
        WHERE id NOT IN (SELECT user_id FROM user_api_calls);
        `;
        await connection.query(syncApiCallsTableQuery);

        const createEndpointUsageTableQuery = `
            CREATE TABLE IF NOT EXISTS endpoint_usage (
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                served_count INT DEFAULT 0,
                PRIMARY KEY (endpoint, method)
            );
        `;
        await connection.query(createEndpointUsageTableQuery);

        // Release the connection back to the pool
        connection.release();

        // Return the pool to use it in other parts of the app
        return pool;
    } catch (err) {
        console.log("Error connecting to the database or creating tables:", err);
        console.error("Error connecting to the database or creating tables:", err);
        throw err;
    }
}

module.exports = initializeDB;
