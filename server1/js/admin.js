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
            console.log("Usage data:", usageData);
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

// Call checkAdminRole on page load
window.onload = checkAdminRole;
