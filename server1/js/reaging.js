const API_PATH = "http://localhost:8080";  // Ensure the correct URL format
const POST = "POST";



// const auth = new Authentication(API_PATH);

function onload() {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_PATH}/reaging`, true);
    xhr.withCredentials = true;  // Include cookies in cross-origin requests

    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
                // User is authenticated
                result = JSON.parse(xhr.responseText);
                const imageUrl = result.data[0]?.url;
                document.getElementById('resultImage').src = imageUrl;
                // console.log(xhr.responseText);
            } else {
                // User is not authenticated
                console.log("User is not authenticated.");
                // window.location.href = './index.html'; // Redirect to login page
            }
        }
    };

    xhr.send();
}

onload();