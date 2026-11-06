
import os
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("../backend/.env")

uri = os.getenv("MONGODB_URI")
if not uri:
    raise RuntimeError("MONGODB_URI not found in backend/.env")

review_ids = [
    "6abcd1907b1f2ea833594e13",
    "6abde7491e207d7aa83e78f4",
    "6abe3154cf5d469dc615e13d",
    "6abe349acf5d469dc615e13f",
    "6ac09fe443792cc97e66b2e4",
    "6ac0a48643792cc97e66b2e7",
    "6ac34ac7bb8996061f5be38f",
    "6ac47311960fae3e3225408a",
]

client = MongoClient(uri, serverSelectionTimeoutMS=10000)

try:
    db = client["medicube"]
    tokens = db["tokens"]
    patients = db["patients"]

    for token_id in review_ids:
        token = tokens.find_one({"_id": ObjectId(token_id)})

        if not token:
            print(f"\nToken ID: {token_id} — NOT FOUND")
            continue

        patient_id = token.get("patient")
        patient = None

        if isinstance(patient_id, ObjectId):
            patient = patients.find_one({"_id": patient_id})

        print("\n------------------------------")
        print("Token ID:", token_id)
        print("Token number:", token.get("tokenNumber"))
        print("Status:", token.get("status"))
        print("Priority:", token.get("priority"))
        print("Patient ID:", patient_id)
        print("Patient name:", patient.get("name") if patient else "Not found")
        print("Created:", token.get("createdAt"))
        print("Consultation start:", token.get("consultationStartTime"))
        print("Consultation end:", token.get("consultationEndTime"))

finally:
    client.close()
