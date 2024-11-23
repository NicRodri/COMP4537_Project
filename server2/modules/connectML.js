const fetch = require("node-fetch");
const FormData = require("form-data");
require('dotenv').config();

const API_URL = process.env.ML_URL;

async function connectML(imageBuffer, auth_token) {
    // console.log("imageBuffer:", imageBuffer);
    
    
    // Prepare the form data
    const formData = new FormData();
    formData.append("image", imageBuffer, { filename: "input_image.jpg", contentType: "image/jpeg" });
    formData.append("source_age", "20");
    formData.append("target_age", "80");

    // console.log("formData:", formData);

    // Set headers to include "auth-token"
    const headers = {
        ...formData.getHeaders(),
        "auth-token": auth_token  // Update header key to "auth-token"
    };

    // console.log("headers:", headers);

    try {
        // Send the form data
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            headers: headers
        });

        // Determine the response content type
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            console.log("JSON Data received");
            const data = await response.json();
            // console.log(data);
            return data;
        } else if (contentType && contentType.includes("image")) {
            console.log("Image data received");
            const resultImage = await response.buffer();
            return resultImage;
        } else {
            console.log("Other data received?");
            const textResponse = await response.text();
            return textResponse;
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

module.exports = { connectML };
