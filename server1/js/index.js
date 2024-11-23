// require('dotenv').config();
const API_PATH = "https://homura.ca/api/v1/api/v1";  // Ensure the correct URL format
console.log(API_PATH)
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

    displayErrorMessage(message) {
        const errorElement = document.getElementById("errorMessage");
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = "block";
        } else {
            alert(message);
        }
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
        xhr.open(POST, `${this.apiPath}/register`);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true; // Allow cookies to be sent and received

        // Handle the response from the server
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);  // Parse the JSON response
                    console.log("Registration successful:", response);
                    // Handle successful registration (e.g., redirect or show success message)
                } else {
                    console.error("Registration failed:", xhr.responseText);
                }
            }
        };

        // Send the data as a JSON string
        xhr.send(JSON.stringify(data));
    }

    async login() {
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
    
        const data = {
            email: email,
            password: password
        };
    
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${this.apiPath}/login`);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;
    
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    console.log("Login successful:", response);
    
                    // Redirect based on user role
                    if (response.user.userType === "admin") {
                        window.location.href = './admin_dashboard.html';
                    } else {
                        window.location.href = './reaging.html';
                    }
                } else {
                    console.error("Login failed:", xhr.responseText);
                    this.displayErrorMessage("Login failed. Please check your credentials.");
                }
            }
        };
    
        xhr.send(JSON.stringify(data));
    }
    
}

// Usage
const auth = new Authentication(API_PATH);

// Function to check if the user is authenticated
function checkAuthentication() {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_PATH}/signedin`, true);
    xhr.withCredentials = true;  // Include cookies in cross-origin requests

    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                // User is authenticated
                console.log("User is authenticated.");
                window.location.href = './reaging.html'; // Redirect to dashboard
            } else {
                // User is not authenticated
                console.log("User is not authenticated.");
                // window.location.href = './index.html'; // Redirect to login page
            }
        }
    };

    xhr.send();
}

checkAuthentication();



