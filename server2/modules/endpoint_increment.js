// trackUsage.js
const pool = require('./dbConfig');

async function incrementEndpointUsage(endpoint, method) {
    // console.log("Incrementing usage for", endpoint, method);
    try {
        // console.log("Incrementing usage for", endpoint, method);
        const connection = await pool.getConnection();

        // Insert a new row if the endpoint-method pair does not exist, otherwise increment the served_count
        const incrementQuery = `
            INSERT INTO endpoint_usage (endpoint, method, served_count)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE served_count = served_count + 1;
        `;
        await connection.query(incrementQuery, [endpoint, method]);

        connection.release();
    } catch (err) {
        console.log("Error incrementing endpoint usage:", err);
        console.error("Error incrementing endpoint usage:", err);
        throw err;
    }
}

module.exports = {incrementEndpointUsage};
