const mysql = require('mysql');
const dbConfig = require('./dbConfig');
const connection = mysql.createConnection(dbConfig);

// Connect to the database
connection.connect((err) => {
    if (err) throw err;
    console.log("Connected to the 'lab5DB' database.");

    // Create the patient table if it doesn't exist
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS patient (
            patientid INT(11) AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            dateOfBirth DATETIME
        ) ENGINE=InnoDB;
    `;
    connection.query(createTableSQL, (err) => {
        if (err) throw err;
        console.log("Table 'patient' created or already exists.");
    });
});

module.exports = connection;
