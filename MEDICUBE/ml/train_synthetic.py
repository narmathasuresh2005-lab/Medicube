
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

# Locate the existing synthetic dataset
BASE_DIR = Path(__file__).resolve().parent
CSV_FILE = BASE_DIR / "data_audit" / "synthetic_consultation_data.csv"
MODEL_FILE = BASE_DIR / "model_synthetic.pkl"

print("========== MEDICUBE SYNTHETIC ML TRAINING ==========")

# Load synthetic records
df = pd.read_csv(CSV_FILE)

# Keep only the expected artificial test data
df = df[df["dataType"] == "SYNTHETIC"].copy()

if len(df) < 20:
    raise ValueError("Not enough synthetic records for this demonstration.")

# Build a reproducible demonstration target.
# This formula is artificial; it is NOT a clinical rule.
priority_adjustment = df["priority"].map({
    "NORMAL": 0.0,
    "EMERGENCY": 2.0
})

df["demoDuration"] = (
    5
    + 0.08 * df["waitingTime"]
    + priority_adjustment
)

# Features available to the demonstration model
X = pd.DataFrame({
    "waitingTime": df["waitingTime"],
    "isEmergency": (df["priority"] == "EMERGENCY").astype(int)
})

y = df["demoDuration"]

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)

# Train a separate synthetic demonstration model
model = RandomForestRegressor(
    n_estimators=150,
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate on held-out synthetic records
predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
rmse = mean_squared_error(y_test, predictions) ** 0.5
r2 = r2_score(y_test, predictions)

print(f"Synthetic records loaded: {len(df)}")
print(f"Training records: {len(X_train)}")
print(f"Testing records: {len(X_test)}")
print("\nDemonstration evaluation:")
print(f"MAE:  {mae:.3f} minutes")
print(f"RMSE: {rmse:.3f} minutes")
print(f"R²:   {r2:.3f}")

# Save to a separate file; do not overwrite model.pkl
joblib.dump(model, MODEL_FILE)

print(f"\nSynthetic model saved to: {MODEL_FILE}")
print("MongoDB modified: NO")
print("Existing model.pkl overwritten: NO")
print("IMPORTANT: Synthetic demonstration only; not clinically validated.")
