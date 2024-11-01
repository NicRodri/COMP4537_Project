window.onload = async function checkAdminRole() {
    try {
        const response = await fetch('http://localhost:8080/signedin', {
            method: 'POST',
            credentials: 'include', // Include cookies in the request
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Check if the user has an admin role
            if (data.user_type !== "admin") {
                alert("Access denied: Admins only");
                window.location.href = './index.html'; // Redirect to login or user page
            }
        } else {
            // Redirect if not authenticated or any other error
            alert("Please log in to access the admin dashboard.");
            window.location.href = './index.html';
        }
    } catch (error) {
        console.error("Error checking admin role:", error);
        alert("An error occurred. Please try again.");
        window.location.href = './index.html'; // Redirect to login page on error
    }
}