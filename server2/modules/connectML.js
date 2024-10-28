const fs = require('fs').promises;
const path = require('path');
const { Blob } = require('buffer'); // For Node.js 20+

async function connectML() {
    const { Client } = await import("@gradio/client");

    // Update the image path to reference the `images` folder
    const imagePath = path.join(__dirname, '../images/face.jpg'); // Replace 'local-image.png' with your actual image filename
    const imageBuffer = await fs.readFile(imagePath);
    const exampleImage = new Blob([imageBuffer], { type: 'image/png' });

    // Initialize the client and call the prediction
    const client = await Client.connect("http://127.0.0.1:7860/");
    const result = await client.predict("/predict", { 
        image: exampleImage, 		
        source_age: 21, 		
        target_age: 80, 
    });

    // console.log(result.data);
    return result;
}

module.exports = { connectML };
