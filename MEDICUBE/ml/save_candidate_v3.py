from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data_audit" / "synthetic_consultation_data_v3.csv"
MODEL_PATH = BASE_DIR / "model_candidate_v3_run2.pkl"

# Never overwrite an existing candidate.
if MODEL_PATH.exists():
    raise FileExistsError(
        f"{MODEL_PATH.name} already exists. "
        "Choose another filename rather than overwriting it."
    )

df = pd.read_csv(DATA_PATH)

required_columns = {
    "dataType",
    "waitingTime",
    "priority",
    "specialization",
    "consultationDuration",
}

missing = required_columns - set(df.columns)
if missing:
    raise ValueError(f"Dataset is missing columns: {sorted(missing)}")

if not (df["dataType"] == "SYNTHETIC").all():
    raise ValueError("This experiment must use synthetic data only.")

if df[list(required_columns)].isnull().any().any():
    raise ValueError("Missing values detected. Fix the dataset first.")

features = ["waitingTime", "priority", "specialization"]
X = df[features]
y = df["consultationDuration"]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            ["priority", "specialization"],
        )
    ],
    remainder="passthrough",
)

model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "regressor",
            RandomForestRegressor(
                n_estimators=200,
                random_state=42,
                min_samples_leaf=3,
            ),
        ),
    ]
)

scores = cross_val_score(
    model,
    X,
    y,
    cv=5,
    scoring="neg_mean_absolute_error",
)

print("Model C candidate validation")
print(f"Dataset rows: {len(df)}")
print(f"Mean cross-validation MAE: {-scores.mean():.3f} minutes")
print("Data source: SYNTHETIC ONLY")

# Fit the candidate on all synthetic rows for software testing.
model.fit(X, y)

joblib.dump(model, MODEL_PATH)

print(f"\nCandidate saved successfully: {MODEL_PATH}")
print("The active model.pkl was not changed.")

# Test a sample prediction.
sample = pd.DataFrame(
    [{
        "waitingTime": 15,
        "priority": "NORMAL",
        "specialization": "General Medicine",
    }]
)

prediction = model.predict(sample)[0]
print(f"Sample predicted duration: {prediction:.2f} minutes")
print("Reminder: This is a software experiment, not a clinical estimate.")
