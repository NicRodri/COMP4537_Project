const API_PATH = "http://localhost:8080";  // Ensure the correct URL format (added double slashes)
const POST = "POST";

class Authentication {
    constructor(apiPath) {
        this.apiPath = apiPath;
        this.authFormsElement = document.getElementById('authForms');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event listeners for register and login buttons
        document.getElementById("registerButton").onclick = () => this.register();
        document.getElementById("loginButton").onclick = () => this.login();
    }

    async register() {
        // Collect data from the registration form
        const username = document.getElementById("registerUsername").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        const data = {
            username: username,
            email: email,
            password: password
        };

        const xhr = new XMLHttpRequest();
        xhr.open(POST, `${this.apiPath}/register`);  // Specify correct endpoint, e.g., /register
        xhr.setRequestHeader("Content-Type", "application/json");

        // Handle the response from the server
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { // Done
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log("Registration successful:", xhr.responseText);
                    // Do something on success (like redirect or show a message)
                } else {
                    console.error("Registration failed:", xhr.responseText);
                    // Handle errors (like displaying an error message)
                }
            }
        };

        // Send the data as a JSON string
        xhr.send(JSON.stringify(data));
    }

    async login() {
        // Collect data from the login form
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const data = {
            email: email,
            password: password
        };

        const xhr = new XMLHttpRequest();
        xhr.open(POST, `${this.apiPath}/login`);  // Specify correct endpoint, e.g., /login
        xhr.setRequestHeader("Content-Type", "application/json");

        // Handle the response from the server
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { // Done
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log("Login successful:", xhr.responseText);
                    // Do something on success (like redirect or store session data)
                } else {
                    console.error("Login failed:", xhr.responseText);
                    // Handle login errors (like displaying an error message)
                }
            }
        };

        // Send the data as a JSON string
        xhr.send(JSON.stringify(data));
    }

}

// Usage
const auth = new Authentication(API_PATH);
