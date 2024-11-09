const API_PATH = "http://localhost:8080";
const cameraPreview = document.getElementById('cameraPreview');
const snapshotCanvas = document.getElementById('snapshotCanvas');
const startCameraButton = document.getElementById('startCameraButton');
const captureButton = document.getElementById('captureButton');
const sendButton = document.getElementById('sendButton');
const jsonDisplay = document.getElementById('jsonDisplay');
const capturedImage = document.getElementById('capturedImage');
const resultImage = document.getElementById('resultImage');
let videoStream;

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
                // window.location.href = './reaging.html'; // Redirect to dashboard
            } else {
                // User is not authenticated
                console.log("User is not authenticated.");
                window.location.href = './index.html'; // Redirect to login pagez
            }
        }
    };

    xhr.send();
}

checkAuthentication();

// Start camera preview
startCameraButton.addEventListener('click', async () => {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraPreview.srcObject = videoStream;
        cameraPreview.style.display = 'block';
        captureButton.style.display = 'inline-block';
    } catch (error) {
        console.error("Error accessing camera:", error);
        alert("Unable to access the camera.");
    }
});

// Capture image from video
captureButton.addEventListener('click', () => {
    const context = snapshotCanvas.getContext('2d');
    snapshotCanvas.width = cameraPreview.videoWidth;
    snapshotCanvas.height = cameraPreview.videoHeight;
    context.drawImage(cameraPreview, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

    // Display captured image
    const capturedDataUrl = snapshotCanvas.toDataURL('image/png');
    capturedImage.src = capturedDataUrl;
    capturedImage.style.display = 'block';
    sendButton.style.display = 'inline-block';
});

sendButton.addEventListener('click', async () => {
    snapshotCanvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'captured-image.png');
        console.log(formData);

        try {
            const response = await fetch(`${API_PATH}/reaging`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                // **Modified code starts here**
                // Handle the response as a Blob since the server is returning image data
                const imageBlob = await response.blob();

                // Create a local URL of that image
                const imageObjectURL = URL.createObjectURL(imageBlob);

                // Display the image in the resultImage element
                resultImage.src = imageObjectURL;
                resultImage.style.display = 'block';

                // Optional: Revoke the object URL after the image has loaded
                resultImage.onload = () => {
                    URL.revokeObjectURL(imageObjectURL);
                };

                console.log("Image received and displayed.");
                // **Modified code ends here**
            } else {
                console.log(response);
                console.error("Error:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Error sending image to API:", error);
        }
    }, 'image/png');
});
async function logout() {
    try {
        const response = await fetch(`${API_PATH}/logout`, {
            method: 'GET',
            credentials: 'include', // Include cookies in the request
        });

        if (response.ok) {
            alert("You have been logged out successfully.");
            window.location.href = './index.html'; // Redirect to login or homepage
        } else {
            alert("Failed to log out. Please try again.");
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("An error occurred. Please try again.");
    }
}