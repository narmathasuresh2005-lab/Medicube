from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import joblib
import uvicorn

app = FastAPI(title="MediCube ML Service")

# Load the trained model from the ml folder
MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"
model = joblib.load(MODEL_PATH)


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


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )