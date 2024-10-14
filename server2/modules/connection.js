const mysql = require('mysql2/promise');
const dbConfig = require('./dbConfig');

async function initializeDB() {
    try {
        // Create a connection using async/await
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to the 'isa_project' database.");
        
        // Return the connection to use it in other parts of the app
        return connection;
    } catch (err) {
        console.error("Error connecting to the database:", err);
        throw err;
    }
}

module.exports = initializeDB;

