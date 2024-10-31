async function connectML(imageBuffer) {
    const { Client } = await import("@gradio/client");
    const { Blob } = require('buffer');
    const exampleImage = new Blob([imageBuffer], { type: 'image/png' });


    const client = await Client.connect("https://homura.makeup/");
    console.log(client)
    console.log(exampleImage)
    const result = await client.predict("/gradio_api/predict", {
        image: exampleImage,
        source_age: 21,
        target_age: 80,
    });
    console.log(result.data);

    return result;
}

module.exports = { connectML };
