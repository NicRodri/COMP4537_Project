const API_PATH = "https://homura.ca/COMP4537/labs/5/api/v1/sql/";
const POST = "POST";
const GET = "GET";
const DEFAULT_QUERY = {
    sqlQuery: "INSERT INTO patient (name, dateOfBirth) VALUES ('Sara Brown', '1901-01-01'), ('John Smith', '1941-01-01'), ('Jack Ma', '1961-01-30'), ('Elon Musk', '1999-01-01')"
};


class SQLClient {
    constructor(apiPath) {
        this.apiPath = apiPath;
        this.feedbackElement = document.getElementById('feedback');
    }

    // Only applies to the textbox with submit button
    sendRequest() {
        const sqlQuery = document.getElementById("sqlQuery").value.trim();
        const data = JSON.stringify({ sqlQuery });

        this.clearFeedback();

        if (!sqlQuery) {
            this.displayFeedback(MESSAGES.INVALID_QUERY, "red");
            return;
        }

        const xhr = new XMLHttpRequest();
        if (sqlQuery.toLowerCase().startsWith("insert")) {
            this.sendPostRequest(xhr, data);
        } else if (sqlQuery.toLowerCase().startsWith("select")) {
            this.sendGetRequest(xhr, sqlQuery);
        } else {
            this.displayFeedback(MESSAGES.INVALID_OPERATION, "red");
        }

        this.handleResponse(xhr, sqlQuery);
    }

    sendPostRequest(xhr, data) {
        xhr.open(POST, this.apiPath);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(data);
    }

    sendGetRequest(xhr, sqlQuery) {
        const queryUrl = `${this.apiPath}?sqlQuery=${encodeURIComponent(sqlQuery)}`;
        xhr.open(GET, queryUrl);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send();
    }

    handleResponse(xhr, sqlQuery) {
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (sqlQuery.toLowerCase().startsWith("insert")) {
                    this.handleInsertResponse(response, sqlQuery);
                } else if (sqlQuery.toLowerCase().startsWith("select")) {
                    this.handleSelectResponse(response);
                }
            } else {
                this.displayFeedback(ERROR.replace('%1', xhr.responseText), "red");
            }
        };
    }

    handleInsertResponse(response, sqlQuery) {
        const values = response.sqlQuery.match(/\bVALUES\s*(\([^)]+\))/i)[1]; // GPT assisted in creating the Regex
        this.displayFeedback(MESSAGES.SUCCESS.replace('%1', values), "green");
    }

    handleSelectResponse(response) {
        const result = response.result;
        this.feedbackElement.style.color = "black";

        if (result.length > 0) {
            let table = this.createTable(result);
            this.feedbackElement.innerHTML = table;
        }
    }

    // ChatGPT helped with this logic
    createTable(result) {
        let table = `<table border="1" cellpadding="5"><tr>`;
        Object.keys(result[0]).forEach(key => {
            table += `<th>${key}</th>`;
        });
        table += `</tr>`;

        result.forEach(row => {
            table += `<tr>`;
            Object.entries(row).forEach(([key, value]) => {
                if (typeof value === 'string' && value.includes('T')) {
                    value = new Date(value).toISOString().split('T')[0];
                }
                table += `<td>${value}</td>`;
            });
            table += `</tr>`;
        });

        table += `</table>`;
        return table;
    }

    clearFeedback() {
        this.feedbackElement.textContent = '';
    }

    displayFeedback(message, color) {
        this.feedbackElement.innerHTML = message;
        this.feedbackElement.style.color = color;
    }

    // For the default data on the single button
    insertDefaultData() {
        this.clearFeedback();

        const sqlQuery = JSON.stringify(DEFAULT_QUERY);
        document.getElementById('sqlQuery').value = sqlQuery;

        const xhr = new XMLHttpRequest();
        this.sendPostRequest(xhr, sqlQuery);

        xhr.onload = () => {
            if (xhr.status === 200) {
                this.displayFeedback(MESSAGES.SUCCESS_DEFAULT, "green");
            } else {
                this.displayFeedback(MESSAGES.ERROR.replace('%1', xhr.responseText), "red");
            }
        };
    }
}

// Usage
const sqlClient = new SQLClient(API_PATH);
document.getElementById("submit").onclick = () => sqlClient.sendRequest();
document.getElementById("insert").onclick = () => sqlClient.insertDefaultData();
