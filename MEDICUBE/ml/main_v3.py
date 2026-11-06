from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
import joblib
import pandas as pd
import uvicorn

app = FastAPI(title="MediCube ML V3 Test Service")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model_candidate_v3_run2.pkl"

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Candidate model not found: {MODEL_PATH}"
    )

model = joblib.load(MODEL_PATH)


class PredictionRequestV3(BaseModel):
    waitingTime: float = Field(ge=0, le=240)
    priority: str
    specialization: str


@app.get("/")
def home():
    return {
        "success": True,
        "message": "MediCube ML V3 test service is running"
    }


@app.get("/model-status")
def model_status():
    return {
        "success": True,
        "message": "V3 candidate model loaded successfully",
        "modelFile": MODEL_PATH.name,
        "dataSource": "SYNTHETIC ONLY"
    }


@app.post("/predict")
def predict(request: PredictionRequestV3):
    allowed_priorities = {"NORMAL", "EMERGENCY"}
    allowed_specializations = {
        "General Medicine",
        "Pediatrics",
        "Cardiology"
    }

    if request.priority not in allowed_priorities:
        raise HTTPException(
            status_code=400,
            detail="priority must be NORMAL or EMERGENCY"
        )

    if request.specialization not in allowed_specializations:
        raise HTTPException(
            status_code=400,
            detail="Unsupported specialization"
        )

    features = pd.DataFrame([{
        "waitingTime": request.waitingTime,
        "priority": request.priority,
        "specialization": request.specialization
    }])

    prediction = model.predict(features)[0]

    return {
        "success": True,
        "model": "Model C V3 candidate",
        "dataSource": "SYNTHETIC ONLY",
        "waitingTime": request.waitingTime,
        "priority": request.priority,
        "specialization": request.specialization,
        "predictedConsultationDuration": round(
            float(prediction), 2
        )
    }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8001
    )
