// incrementUserApiCalls.js
const pool = require('./dbConfig');

async function incrementUserApiCalls(userId) {
    try {
        const connection = await pool.getConnection();

        // Insert a new row if the user_id does not exist, otherwise increment the api_call_count
        const query = `
            INSERT INTO user_api_calls (user_id, api_call_count)
            VALUES (?, 1)
            ON DUPLICATE KEY UPDATE api_call_count = api_call_count + 1;
        `;
        await connection.query(query, [userId]);
        connection.release();
    } catch (err) {
        console.error(`Failed to increment API call count for user ${userId}:`, err.message);
        throw err;
    }
}

module.exports = {incrementUserApiCalls};
