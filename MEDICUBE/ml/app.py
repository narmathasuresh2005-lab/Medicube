from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import uvicorn

app = FastAPI()

# Load trained ML model
model = joblib.load("model.pkl")


# Request data format
class PredictionRequest(BaseModel):
    waitingTime: float


@app.get("/")
def home():
    return {
        "success": True,
        "message": "MediCube ML service is running"
    }


@app.get("/model-status")
def model_status():
    return {
        "success": True,
        "message": "ML model loaded successfully"
    }


@app.post("/predict")
def predict(request: PredictionRequest):

    prediction = model.predict([
        [request.waitingTime]
    ])

    return {
        "success": True,
        "waitingTime": request.waitingTime,
        "predictedConsultationDuration": round(
            float(prediction[0]), 2
        )
    }


# Start FastAPI server
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )