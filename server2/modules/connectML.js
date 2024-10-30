const fs = require('fs').promises;
const path = require('path');
const { Blob } = require('buffer'); // For Node.js 20+

async function connectML() {
    try {
        const { Client } = await import("@gradio/client");

        // Define the path to the image in the `images` folder
        const imagePath = path.join(__dirname, '../images/face.jpg');
        
        // Load the image as a buffer and create a Blob for compatibility with the client
        let imageBuffer;
        try {
            imageBuffer = await fs.readFile(imagePath);
        } catch (err) {
            console.error("Error reading image file:", err.message);
            throw new Error("Image file could not be read. Check the file path and ensure the image exists.");
        }

        const exampleImage = new Blob([imageBuffer], { type: 'image/png' });

        // Initialize the client and call the prediction
        const client = await Client.connect("https://homura.makeup/");
        
        // Set up prediction parameters and handle potential prediction errors
        let result;
        try {
            result = await client.predict("/predict", {
                image: exampleImage,
                source_age: 21,
                target_age: 80,
            });
        } catch (err) {
            console.error("Error during prediction:", err.message);
            throw new Error("Prediction failed. Please check the connection to the model service.");
        }

        // Return the result if everything was successful
        return result;
    } catch (error) {
        console.error("Error in connectML:", error.message);
        throw new Error("Failed to connect to the ML service.");
    }
}

module.exports = { connectML };
