
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data_audit" / "synthetic_consultation_data_v3.csv"
OUTPUT_PATH = BASE_DIR / "data_audit" / "feature_comparison_v3.csv"

if not DATA_PATH.exists():
    raise SystemExit(f"Dataset not found: {DATA_PATH}")

if OUTPUT_PATH.exists():
    raise SystemExit(
        f"Report already exists; nothing overwritten: {OUTPUT_PATH}"
    )

df = pd.read_csv(DATA_PATH)

required = {
    "recordId",
    "dataType",
    "waitingTime",
    "priority",
    "specialization",
    "consultationDuration",
}

missing = required - set(df.columns)
if missing:
    raise SystemExit(f"Missing columns: {sorted(missing)}")

if not (df["dataType"] == "SYNTHETIC").all():
    raise SystemExit("Unexpected data type. Experiment stopped.")

if df["recordId"].duplicated().any():
    raise SystemExit("Duplicate record IDs found.")

for column in ["waitingTime", "consultationDuration"]:
    df[column] = pd.to_numeric(df[column], errors="coerce")

df = df.dropna(
    subset=[
        "waitingTime",
        "priority",
        "specialization",
        "consultationDuration",
    ]
).copy()

df = df[
    np.isfinite(df["waitingTime"])
    & np.isfinite(df["consultationDuration"])
    & (df["waitingTime"] >= 0)
    & (df["consultationDuration"] > 0)
    & df["priority"].isin(["NORMAL", "EMERGENCY"])
    & df["specialization"].isin(
        ["General Medicine", "Pediatrics", "Cardiology"]
    )
].copy()

if len(df) < 10:
    raise SystemExit("Not enough valid rows for cross-validation.")

y = df["consultationDuration"]

cv = KFold(
    n_splits=5,
    shuffle=True,
    random_state=42,
)

def make_model(categorical_columns):
    transformers = []

    if categorical_columns:
        transformers.append(
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_columns,
            )
        )

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="passthrough",
    )

    return Pipeline([
        ("preprocessor", preprocessor),
        (
            "regressor",
            RandomForestRegressor(
                n_estimators=200,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ])

experiments = {
    "Baseline: mean": None,
    "Model A: waitingTime": ["waitingTime"],
    "Model B: waitingTime + priority": [
        "waitingTime", "priority"
    ],
    "Model C: waitingTime + priority + specialization": [
        "waitingTime", "priority", "specialization"
    ],
}

results = []
predictions_by_model = {}

print("MEDICUBE V3 SYNTHETIC FEATURE EXPERIMENT")
print("Records evaluated:", len(df))
print("Validation: 5-fold cross-validation")
print("Data source: SYNTHETIC ONLY")

for name, features in experiments.items():
    if features is None:
        model = DummyRegressor(strategy="mean")
        X = df[["waitingTime"]]
    elif features == ["waitingTime"]:
        # Preserve the current one-feature model structure.
        model = Pipeline([
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ])
        X = df[features]
    else:
        categorical = [
            col for col in features if col != "waitingTime"
        ]
        model = make_model(categorical)
        X = df[features]

    predicted = cross_val_predict(model, X, y, cv=cv)

    mae = mean_absolute_error(y, predicted)
    rmse = np.sqrt(mean_squared_error(y, predicted))
    r2 = r2_score(y, predicted)

    results.append({
        "model": name,
        "MAE_minutes": mae,
        "RMSE_minutes": rmse,
        "R2": r2,
    })

    predictions_by_model[name] = predicted

results_df = pd.DataFrame(results)
print("\nRESULTS")
print(results_df.round(3).to_string(index=False))

report = pd.DataFrame({
    "recordId": df["recordId"].to_numpy(),
    "ActualDuration": y.to_numpy(),
})

for name, predicted in predictions_by_model.items():
    safe_name = (
        name.lower()
        .replace(":", "")
        .replace(" + ", "_")
        .replace(" ", "_")
    )
    report[f"{safe_name}_prediction"] = predicted

report.to_csv(OUTPUT_PATH, index=False)
print("\nPrediction report saved:", OUTPUT_PATH)

print(
    "\nReminder: Synthetic results do not establish "
    "real-world clinical prediction accuracy."
)
print("No model files were saved or replaced.")
