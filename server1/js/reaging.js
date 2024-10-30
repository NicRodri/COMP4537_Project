const API_PATH = "http://localhost:8080";  // Ensure the correct URL format
const POST = "POST";

function fetchData() {
    const xhr = new XMLHttpRequest();
    xhr.open(POST, `${API_PATH}/reaging`, true);
    xhr.withCredentials = true;  // Include cookies in cross-origin requests

    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            // const jsonDisplay = document.getElementById('jsonDisplay');
            const resultImage = document.getElementById('resultImage');
            if (xhr.status >= 200 && xhr.status < 300) {
                // Display raw JSON response
                const result = JSON.parse(xhr.responseText);
                // jsonDisplay.textContent = JSON.stringify(result, null, 2); // Pretty print JSON

                // Extract image URL from response and display it
                const imageUrl = result.result[0]?.url;
                if (imageUrl) {
                    resultImage.src = imageUrl;
                    resultImage.style.display = 'block'; // Show the image
                }
            } else {
                jsonDisplay.textContent = "User is not authenticated.";
                resultImage.style.display = 'none'; // Hide the image if there's an error
            }
        }
    };

    xhr.send();
}

document.getElementById('requestButton').addEventListener('click', fetchData);
