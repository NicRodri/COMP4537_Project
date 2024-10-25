from ultralytics import YOLO
import cv2
import os

# This file is for if you want to perform image detection through your webcam

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "yolo11n.pt")

# Load a pretrained YOLO model
model = YOLO(model_path)  # Ensure the model path is correct

# Start capturing video from the webcam
cap = cv2.VideoCapture(0)  # Use 0 for the default camera

while True:
    # Read a frame from the webcam
    ret, frame = cap.read()
    
    if not ret:
        print("Failed to grab frame")
        break
    
    # Perform object detection on the frame
    results = model(frame)  # Pass the frame to the model

    # Loop through each detection result
    for result in results:
        # Access the boxes, classes, and confidences from the result
        boxes = result.boxes.xyxy  # Bounding box coordinates
        confs = result.boxes.conf   # Confidence scores
        classes = result.boxes.cls   # Class IDs

        # Draw bounding boxes and labels on the frame
        for box, conf, cls in zip(boxes, confs, classes):
            x1, y1, x2, y2 = map(int, box)  # Convert to integer
            label = f"{model.names[int(cls)]}: {conf:.2f}"  # Class name and confidence
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)  # Draw rectangle
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)  # Draw label

    # Display the resulting frame
    cv2.imshow('Webcam Detection', frame)  # Display the processed frame

    # Break the loop if 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the capture and close windows
cap.release()
cv2.destroyAllWindows()
