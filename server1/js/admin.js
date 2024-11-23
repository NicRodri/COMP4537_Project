// admin.js
const API_PATH = "http://localhost:8080";

async function checkAdminRole() {
    try {
        console.log("Checking admin role...");
        const response = await fetch(`${API_PATH}/admin_dashboard`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                console.warn("Access forbidden: 403 error");
                alert("Access denied. Redirecting to login page.");
                window.location.href = './index.html';
                return;
            }
            throw new Error(`Unexpected response status: ${response.status}`);
        }

        // Admin access confirmed, display dashboard content and fetch usage data
        document.getElementById("admin-dashboard-content").style.display = "block";
        await fetchUsageData();  // Fetch and display usage data

    } catch (error) {
        console.error("Error checking admin role:", error);
        alert("An error occurred. Please try again.");
        window.location.href = './index.html';
    }
}

async function fetchUsageData() {
    try {
        const response = await fetch(`${API_PATH}/get_usage_data`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const usageData = await response.json();
            // console.log("Usage data:", usageData);
            displayUsageData(usageData);
        } else {
            console.error("Failed to fetch usage data:", response.status, response.statusText);
            alert("Failed to load usage data.");
        }
    } catch (error) {
        console.error("Error fetching usage data:", error);
        alert("An error occurred while fetching usage data.");
    }
}
function redirectToPage() {
    window.location.href = 'http://127.0.0.1:5500/server1/reaging.html';
}


function displayUsageData(data) {
    if (!Array.isArray(data)) {
        console.error("Expected data to be an array but got:", data);
        return;
    }

    const tableBody = document.getElementById('usage-table-body');
    tableBody.innerHTML = ''; // Clear existing data

    data.forEach((item) => {
        const row = document.createElement('tr');

        const endpointCell = document.createElement('td');
        endpointCell.textContent = item.endpoint;
        row.appendChild(endpointCell);

        const methodCell = document.createElement('td');
        methodCell.textContent = item.method;
        row.appendChild(methodCell);

        const countCell = document.createElement('td');
        countCell.textContent = item.served_count;
        row.appendChild(countCell);

        tableBody.appendChild(row);
    });
}

async function logout() {
    try {
        const response = await fetch(`${API_PATH}/logout`, {
            method: 'GET',
            credentials: 'include',
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

// admin.js

async function fetchUserApiCalls() {
    try {
        const response = await fetch(`${API_PATH}/get_user_api_calls`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const userData = await response.json();
            // console.log("User data:", userData);
            displayUserApiCalls(userData);
        } else {
            console.error("Failed to fetch user data:", response.status, response.statusText);
            alert("Failed to load user data.");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        alert("An error occurred while fetching user data.");
    }
}

async function deleteUser(userId) {
    try {
        const confirmation = confirm("Are you sure you want to delete this user?");
        if (!confirmation) return;

        const response = await fetch(`${API_PATH}/delete_user/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (response.ok) {
            alert("User deleted successfully.");
            await fetchUserApiCalls(); // Refresh the user table after deletion
        } else {
            console.error("Failed to delete user:", response.status, response.statusText);
            alert("Failed to delete user. Please try again.");
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("An error occurred while deleting the user.");
    }
}

function displayUserApiCalls(data) {
    const tableBody = document.getElementById('user-api-table-body');
    tableBody.innerHTML = ''; // Clear existing data
    // console.log("User data:", data);    

    data.forEach((user) => {
        const row = document.createElement('tr');

        const usernameCell = document.createElement('td');
        usernameCell.textContent = user.username;
        row.appendChild(usernameCell);

        const emailCell = document.createElement('td');
        emailCell.textContent = user.email;
        row.appendChild(emailCell);

        const apiCallsCell = document.createElement('td');
        apiCallsCell.textContent = user.api_call_count;
        row.appendChild(apiCallsCell);

        const roleCell = document.createElement('td');
        roleCell.textContent = user.user_type || 'user'; // Default role is 'user'
        row.appendChild(roleCell);

        // Add delete button
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = () => deleteUser(user.id); // Attach delete function
        // console.log("User ID:", user.id);
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);

        tableBody.appendChild(row);

        const updateCell = document.createElement('td');
        const updateButton = document.createElement('button');
        updateButton.className = 'update-button';

        if (user.user_type === 'admin') {
            updateButton.textContent = 'Make User'; // Button to demote admin to user
            updateButton.onclick = () => updateUserRole(user.id, 'user'); // Call updateUserRole with 'user'
        } else {
            updateButton.textContent = 'Make Admin'; // Button to promote user to admin
            updateButton.onclick = () => updateUserRole(user.id, 'admin'); // Call updateUserRole with 'admin'
        }

        updateCell.appendChild(updateButton);
        row.appendChild(updateCell);

        tableBody.appendChild(row);
    });
}

async function updateUserRole(userId, newRole) {
    try {
        console.log(`Updating user role to ${newRole}...`);
        console.log("User ID:", userId);
        const confirmation = confirm(`Are you sure you want to update this user to be an ${newRole}?`);
        if (!confirmation) return;

        const response = await fetch(`${API_PATH}/update_user_role/${userId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: newRole }), // Send the new role in the request body
        });

        if (response.ok) {
            alert(`User role updated to ${newRole} successfully.`);
            await fetchUserApiCalls(); // Refresh the user table after updating
        } else {
            console.error("Failed to update user role:", response.status, response.statusText);
            alert("Failed to update user role. Please try again.");
        }
    } catch (error) {
        console.error("Error updating user role:", error);
        alert("An error occurred while updating the user role.");
    }
}



// Fetch user API call data when the admin dashboard loads
window.onload = async () => {
    await checkAdminRole();  // Check admin role and fetch usage data
    await fetchUserApiCalls();  // Fetch and display user API calls
};

