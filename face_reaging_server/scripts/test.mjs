import { Client } from "@gradio/client";

async function runPrediction() {
    const response_0 = await fetch("https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
    const exampleImage = await response_0.blob();


    
    const client = await Client.connect("https://homura.makeup/", {
        events: ["status", "data"]
    });

    console.log(response_0);
    console.log(exampleImage);
    console.log(client);

    const result = await client.predict("/predict", { 
        image: exampleImage,        
        source_age: 10,         
        target_age: 10, 
    });




}

runPrediction();
