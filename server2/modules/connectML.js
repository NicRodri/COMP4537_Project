const fetch = require("node-fetch");
const FormData = require("form-data");
require('dotenv').config();

const API_URL = process.env.ML_URL_PRODUCTION

async function connectML(imageBuffer) {
    // Prepare the form data
    const formData = new FormData();
    formData.append("image", imageBuffer, { filename: "input_image.jpg", contentType: "image/jpeg" });
    formData.append("source_age", "20");
    formData.append("target_age", "80");

    try {
        // Send the form data
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            headers: formData.getHeaders(), // Set headers for multipart form-data
        });

        // Determine the response content type
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            // Parse JSON response
            const data = await response.json();
            return data;
        } else if (contentType && contentType.includes("image")) {
            // If response is an image, read it as a buffer
            const resultImage = await response.buffer();
            return resultImage; // You can return the image buffer, or save it as needed
        } else {
            // Handle plain text or unexpected content types
            const textResponse = await response.text();
            return textResponse;
        }
    } catch (error) {
        console.error("Error:", error);
        throw error; // Rethrow error for further handling
    }
}

module.exports = { connectML };

