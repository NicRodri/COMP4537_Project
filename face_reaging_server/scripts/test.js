const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function uploadImage() {
    // Define the path where you want to save the image locally
    const imagePath = path.join(__dirname, "downloaded_image.jpg");

    // Fetch the image as a buffer
    const response = await fetch("https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg");
    const exampleImage = await response.buffer();

    // Save the image locally
    fs.writeFileSync(imagePath, exampleImage);
    console.log(`Image saved locally at ${imagePath}`);

    // Append the saved image file to FormData
    const formData = new FormData();
    formData.append("image", fs.createReadStream(imagePath), { filename: "downloaded_image.jpg", contentType: "image/jpeg" });
    formData.append("source_age", "20");
    formData.append("target_age", "80");

    // Send the form data
    const apiResponse = await fetch("http://127.0.0.1:8000/process_image/", {
        method: "POST",
        body: formData,
        headers: formData.getHeaders() // Set correct headers for multipart/form-data
    });

    // Handle different content types in the response
    const contentType = apiResponse.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        // Parse JSON response
        const data = await apiResponse.json();
        console.log("JSON Response:", data);
    } else if (contentType && contentType.includes("image")) {
        // Parse binary response as an image
        const imageBuffer = await apiResponse.buffer();
        fs.writeFileSync(path.join(__dirname, "processed_image.png"), imageBuffer);
        console.log("Processed image saved locally as 'processed_image.png'");
    } else {
        // Parse as plain text
        const textResponse = await apiResponse.text();
        console.log("Text Response:", textResponse);
    }
}

uploadImage();
console.log("end");
