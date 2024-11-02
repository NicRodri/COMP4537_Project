const API_PATH = "https://homura.ca/COMP4537/project";
async function checkAdminRole() {
    try {
        console.log("Checking admin role...");
        const response = await fetch(`${API_PATH}/signedin`, {
            method: 'POST',
            credentials: 'include', // Include cookies in the request
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Received data:", data);

            // This logic will be changed to server side later on.
            // Check if the user has an admin role
            if (data.user_type === "admin") {
                console.log("User is admin, showing dashboard...");
                // document.getElementById("loading-message").style.display = "none";
                document.getElementById("admin-dashboard-content").style.display = "block";
            } else {
                alert("Access denied: Admins only");
                window.location.href = './index.html';
            }
        } else {
            // Log response for debugging
            console.error("Failed response:", response.status, response.statusText);
            alert("Please log in to access the admin dashboard.");
            window.location.href = './index.html';
        }
    } catch (error) {
        console.error("Error checking admin role:", error);
        alert("An error occurred. Please try again.");
        window.location.href = './index.html';
    }
}

// Call checkAdminRole on page load
window.onload = checkAdminRole;

async function logout() {
    try {
        const response = await fetch(`${API_PATH}/logout`, {
            method: 'GET',
            credentials: 'include', // Include cookies in the request
        });

        if (response.ok) {
            alert("You have been logged out successfully.");
            window.location.href = './index.html';
        } else {
            console.error("Logout failed:", response.status, response.statusText);
            alert("Failed to log out. Please try again.");
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("An error occurred. Please try again.");
    }
}