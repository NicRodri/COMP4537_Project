// incrementUserApiCalls.js
const pool = require('./dbConfig');

async function incrementUserApiCalls(userId) {
    try {
        const connection = await pool.getConnection();

        // Get the current API call count for the user
        const [rows] = await connection.query('SELECT api_call_count FROM user_api_calls WHERE user_id = ?', [userId]);

        let apiCallCount = 0;
        if (rows.length > 0) {
            apiCallCount = rows[0].api_call_count;
        }

        // Increment the API call count
        if (rows.length > 0) {
            await connection.query(
                'UPDATE user_api_calls SET api_call_count = api_call_count + 1 WHERE user_id = ?',
                [userId]
            );
        } else {
            await connection.query(
                'INSERT INTO user_api_calls (user_id, api_call_count) VALUES (?, 1)',
                [userId]
            );
            apiCallCount = 1;
        }

        connection.release();
        // console.log(`Incremented API call count for user ${userId}: ${apiCallCount + 1}`);
        // Check if the API call count exceeds the threshold of 20
        return apiCallCount + 1 > 20;
    } catch (err) {
        console.error(`Failed to increment API call count for user ${userId}:`, err.message);
        throw err;
    }
}

module.exports = {incrementUserApiCalls};
