async function connectML(imageBuffer) {
    const { Client } = await import("@gradio/client");
    const { Blob } = require('buffer');
    const exampleImage = new Blob([imageBuffer], { type: 'image/png' });

    const client = await Client.connect("https://homura.makeup/");
    const result = await client.predict("/predict", {
        image: exampleImage,
        source_age: 21,
        target_age: 80,
    });

    return result;
}

module.exports = { connectML };
