const API_PATH = "http://localhost:8080";  // Ensure the correct URL format
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

        // Handle the response from the server
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log("Registration successful:", xhr.responseText);
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
        // Collect data from the login form
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const data = {
            email: email,
            password: password
        };

        const xhr = new XMLHttpRequest();
        xhr.open(POST, `${this.apiPath}/login`);
        xhr.setRequestHeader("Content-Type", "application/json");

        // Handle the response from the server
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);  // Parse the JSON response
                    const token = response.token;  // Assuming the server returns the token in the `token` field
                    console.log("Login successful:", response);

                    // Store JWT in a cookie with expiration (e.g., 1 hour)
                    this.setCookie("authToken", token, 1);  // Store for 1 hour
                } else {
                    console.error("Login failed:", xhr.responseText);
                }
            }
        };

        // Send the data as a JSON string
        xhr.send(JSON.stringify(data));
    }

    // Helper function to set cookies
    setCookie(name, value, hours) {
        let expires = "";
        if (hours) {
            const date = new Date();
            date.setTime(date.getTime() + (hours * 60 * 60 * 1000));  // Cookie expires in `hours` hours
            expires = "; expires=" + date.toUTCString();
        }
        // document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict; Secure"; //Made it less secure for now, need to change back when deployment
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
        console.log(name);
    }

    // Helper function to get cookies (if needed for future use)
    getCookie(name) {
        const nameEQ = name + "=";
        const cookiesArray = document.cookie.split(';');
        for (let i = 0; i < cookiesArray.length; i++) {
            let cookie = cookiesArray[i];
            while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
            if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length, cookie.length);
        }
        return null;
    }
}

// Usage
const auth = new Authentication(API_PATH);

// Function to check if the user is authenticated
function checkAuthentication() {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_PATH}/signedin`, true);
    xhr.withCredentials = true;  // Include cookies in cross-origin requests

    token = "Bearer " + auth.getCookie("authToken");
    xhr.setRequestHeader('Authorization', token);

    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                // User is authenticated
                console.log("User is authenticated.");
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



