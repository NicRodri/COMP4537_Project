import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import jwt
import torch
import io
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, Header, HTTPException, Depends
from fastapi.responses import StreamingResponse
from PIL import Image
from model.models import UNet
from scripts.test_functions import process_image, process_video
import mysql.connector

# Load environment variables from .env file
load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY')  # Retrieve SECRET_KEY from .env
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')

# Initialize the FastAPI app
app = FastAPI()

# Initialize your model once when the app starts
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
unet_model = UNet().to(device)
unet_model.load_state_dict(torch.load("model/best_unet_model.pth", map_location=device))
unet_model.eval()

def verify_token(auth_token):
    print("Received auth_token:", auth_token)
    db_connection = None  # Initialize db_connection to None
    try:
        # Decode token
        decoded_token = jwt.decode(auth_token, SECRET_KEY, algorithms=["HS256"])
        print("Decoded token:", decoded_token)

        # Connect to the database to check if the token is blacklisted
        db_connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = db_connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM token_blacklist WHERE token = %s", (auth_token,))
        blacklisted = cursor.fetchone()
        print("Token blacklisted:", bool(blacklisted))  # Log if token is blacklisted

        if blacklisted:
            raise HTTPException(status_code=403, detail="Token is blacklisted")

        # Token is valid and not blacklisted
        return decoded_token

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=403, detail="Invalid token")
    finally:
        if db_connection and db_connection.is_connected():
            cursor.close()
            db_connection.close()



@app.post("/process_image/")
async def process_image_api(
    image: UploadFile = File(...),
    source_age: int = Form(...),
    target_age: int = Form(...),
    auth_token: str = Header(...)
):
    # auth_token = verify_token(auth_token)

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


import uvicorn
uvicorn.run(app, host="127.0.0.1", port=8000)
