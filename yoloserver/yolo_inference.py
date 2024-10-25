from ultralytics import YOLO
import os

# Get the current directory of the script
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "yolo11n.pt")
load_img_path = os.path.join(current_dir, "input\\bus.jpg")
save_img_path = os.path.join(current_dir, "output")

# Ensure the results directory exists
os.makedirs(save_img_path, exist_ok=True)

# Load a pretrained YOLO model
model = YOLO(model_path)

# Perform object detection on an image
results = model(load_img_path)

# Visualize the results
for result in results:
    result.show()

# Save the detected images
count = 0  
for result in results:
    result.save(os.path.join(save_img_path, f"{count}.jpg")) 
    count += 1  


