const API_PATH = "https://homura.ca/COMP4537/project/api/v1";

class Authentication {
    constructor(apiPath) {
        this.apiPath = apiPath;
        this.setupEventListeners();
        this.checkAuthentication();
    }

    setupEventListeners() {
        // Use form submit events instead of button clicks
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
    }

    showFeedback(formType, message, isError = false) {
        const feedbackElement = document.getElementById(`${formType}-feedback`);
        feedbackElement.textContent = message;
        feedbackElement.className = `feedback ${isError ? 'error' : 'success'}`;
        feedbackElement.style.display = 'block';

        // Hide feedback after 5 seconds
        setTimeout(() => {
            feedbackElement.style.display = 'none';
        }, 5000);
    }

    async register() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const data = { username, email, password };

        try {
            const response = await fetch(`${this.apiPath}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showFeedback('register', 'Registration successful!');
                // Redirect based on user role
                if (result.user.userType === 'admin') {
                    window.location.href = './admin_dashboard.html';
                } else {
                    window.location.href = './reaging.html';
                }
            } else {
                const error = await response.text();
                this.showFeedback('register', `Registration failed: ${error}`, true);
            }
        } catch (error) {
            this.showFeedback('register', 'Network error occurred', true);
            console.error('Registration error:', error);
        }
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const data = { email, password };

        try {
            const response = await fetch(`${this.apiPath}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                this.showFeedback('login', 'Login successful!');

                // Redirect based on user role
                if (result.user.userType === 'admin') {
                    window.location.href = './admin_dashboard.html';
                } else {
                    window.location.href = './reaging.html';
                }
            } else {
                const error = await response.text();
                this.showFeedback('login', 'Invalid email or password', true);
            }
        } catch (error) {
            this.showFeedback('login', 'Network error occurred', true);
            console.error('Login error:', error);
        }
    }

    async checkAuthentication() {
        try {
            const response = await fetch(`${this.apiPath}/signedin`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                console.log("User is authenticated.");
                window.location.href = './reaging.html';
            } else {
                console.log("User is not authenticated.");
            }
        } catch (error) {
            console.error('Authentication check error:', error);
        }
    }
}

// Initialize the Authentication class
const auth = new Authentication(API_PATH);