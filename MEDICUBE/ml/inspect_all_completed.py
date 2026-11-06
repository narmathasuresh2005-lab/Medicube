
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("../backend/.env")

uri = os.getenv("MONGODB_URI")
if not uri:
    raise RuntimeError("MONGODB_URI not found in backend/.env")

client = MongoClient(uri, serverSelectionTimeoutMS=10000)

try:
    db = client["medicube"]
    tokens = db["tokens"]
    patients = db["patients"]

    completed_tokens = tokens.find(
        {"status": "COMPLETED"}
    ).sort("tokenNumber", 1)

    for token in completed_tokens:
        patient_id = token.get("patient")
        patient = None

        if patient_id is not None:
            patient = patients.find_one({"_id": patient_id})

        print(
            f"Token #{token.get('tokenNumber')} | "
            f"Patient: {patient.get('name', 'Unknown') if patient else 'Unknown'} | "
            f"Priority: {token.get('priority')} | "
            f"Created: {token.get('createdAt')} | "
            f"Start: {token.get('consultationStartTime')} | "
            f"End: {token.get('consultationEndTime')}"
        )

finally:
    client.close()
