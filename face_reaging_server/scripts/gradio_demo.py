import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import io
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from PIL import Image

from model.models import UNet
from scripts.test_functions import process_image, process_video

app = FastAPI()

# Initialize your model once when the app starts
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
unet_model = UNet().to(device)
unet_model.load_state_dict(torch.load("model/best_unet_model.pth", map_location=device))
unet_model.eval()

# Define the API endpoint for processing images
@app.post("/process_image/")
async def process_image_api(
    image: UploadFile = File(...),
    source_age: int = Form(...),
    target_age: int = Form(...)
):
    image_data = await image.read()
    pil_image = Image.open(io.BytesIO(image_data)).convert("RGB")
    processed_image = process_image(
        unet_model,
        pil_image,
        video=False,
        source_age=source_age,
        target_age=target_age,
        window_size=512,
        stride=256
    )
    buf = io.BytesIO()
    processed_image.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

