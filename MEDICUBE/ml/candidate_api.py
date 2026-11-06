from pathlib import Path

import joblib
import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model_candidate_priority_experiment_20261012_124907_341240.pkl"

model = joblib.load(MODEL_PATH)

app = FastAPI(title="MediCube Experimental ML Candidate")


class PredictionRequest(BaseModel):
    waitingTime: float = Field(ge=0, le=240)
    priority: str


@app.get("/")
def home():
    return {
        "success": True,
        "message": "MediCube experimental candidate service is running",
        "model": MODEL_PATH.name,
        "dataSource": "SYNTHETIC ONLY",
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    priority = request.priority.upper()

    if priority not in {"NORMAL", "EMERGENCY"}:
        raise HTTPException(
            status_code=400,
            detail="Priority must be NORMAL or EMERGENCY",
        )

    sample = pd.DataFrame([{
        "waitingTime": request.waitingTime,
        "priority": priority,
    }])

    prediction = float(model.predict(sample)[0])

    return {
        "success": True,
        "waitingTime": request.waitingTime,
        "priority": priority,
        "predictedConsultationDuration": round(prediction, 2),
        "model": "Experimental Random Forest candidate",
        "dataSource": "SYNTHETIC ONLY",
        "clinicalValidation": False,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
