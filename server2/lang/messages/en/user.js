const MESSAGES = {
    GREETING_DATE: 'Hello %1, What a beautiful day. Server current date and time is %2',
    BAD_REQUEST: '<h1>400 Bad Request: Please specify a file to read in the URL, e.g., /readFile/filename.txt</h1>',
    NOT_FOUND: '<h1>404 Not Found</h1>',
    WRITING_ERROR: `<h1>500 Internal Server Error: Unable to write to %1</h1>`,
    WRITING_SUCCESS: `<h1>Text "%1" written successfully to %2</h1>`,
    READ_ERROR: `<h1>404 Not Found: %1 does not exist</h1>`,
    READ_SUCCESS: `<pre>%1</pre>`,
    INVALID_OPERATION: 'This operation is not allowed!',
    INVALID_QUERY: "Please enter a valid SQL query.",
    INVALID_METHOD: "Method Not Allowed",
    EMPTY_QUERY: "No SQL query provided in the query string",
    SUCCESS_QUERY: "Query executed successfully",
    INVALID_INPUT: "Invalid input",
    INVALID_FORMAT: "Invalid format",
};


module.exports = { MESSAGES }; 