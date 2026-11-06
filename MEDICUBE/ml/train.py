
import os
import math
from pathlib import Path
from datetime import datetime, timedelta

import joblib
import numpy as np
import pandas as pd

from dotenv import load_dotenv
from pymongo import MongoClient

from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import LeaveOneOut, KFold, cross_val_predict
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ============================================================
# 1. PATHS AND CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "data_audit"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(BASE_DIR.parent / "backend" / ".env")
MONGO_URI = os.getenv("MONGODB_URI")

MAX_WAITING_MINUTES = 240
MAX_CONSULTATION_MINUTES = 180
MIN_RECORDS_TO_TRAIN = 5

SYNTHETIC_PATH = OUTPUT_DIR / "synthetic_consultation_data_v2.csv"

MONGODB_CANDIDATE_PATH = BASE_DIR / "model_candidate_mongodb.pkl"
SYNTHETIC_CANDIDATE_PATH = BASE_DIR / "model_candidate_synthetic.pkl"


# ============================================================
# 2. KNOWN TEST TOKENS
# ============================================================

# These 16 MongoDB token IDs were confirmed to be test records.
# They must never be used as genuine clinical training data.

TEST_TOKEN_IDS = {
    "6abcd1907b1f2ea833594e13",
    "6abde7491e207d7aa83e78f4",
    "6abe3154cf5d469dc615e13d",
    "6abe349acf5d469dc615e13f",
    "6ac08cb76482e8673ae7d4c4",
    "6ac09cc543792cc97e66b2df",
    "6ac09fe443792cc97e66b2e4",
    "6ac0a48643792cc97e66b2e7",
    "6ac34130da134f63641c8cc8",
    "6ac34ac7bb8996061f5be38f",
    "6ac47311960fae3e3225408a",
    "6ac4808e16d73dcafb348bb0",
    "6ac721c064bc818385c57584",
    "6ac7233a64bc818385c57587",
    "6ac725cb64bc818385c57593",
    "6ac7689585c8c67611e785f9",
    "6acdcc4b619a50092dca0ae5",
    "6accae23909b759631e7c95f",
}

# IMPORTANT:
# Keep this set empty until you have independently verified genuine
# clinical records and explicitly approved their token IDs.
#
# Adding a token ID here means you have confirmed that the record
# represents genuine data and is suitable for model training.
VERIFIED_GENUINE_TOKEN_IDS = set()


# ============================================================
# 3. SAFE FILE SAVING
# ============================================================

# Never overwrite an existing report or candidate model.
# If the original filename exists, create a timestamped filename.

def get_safe_path(path):
    path = Path(path)

    if not path.exists():
        return path

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return path.with_name(
        f"{path.stem}_{timestamp}{path.suffix}"
    )


# ============================================================
# 4. MODEL CONFIGURATION
# ============================================================

def make_random_forest():
    return RandomForestRegressor(
        n_estimators=200,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )


# ============================================================
# 5. MODEL EVALUATION
# ============================================================

def print_metrics(name, actual, predicted):
    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))

    if len(actual) >= 2:
        r2 = r2_score(actual, predicted)
    else:
        r2 = float("nan")

    print(f"\n{name}")
    print(f"MAE:  {mae:.3f} minutes")
    print(f"RMSE: {rmse:.3f} minutes")
    print(f"R²:   {r2:.3f}")


def evaluate_models(X, y, cv, label, report_path):
    baseline = DummyRegressor(strategy="mean")
    rf = make_random_forest()

    baseline_predictions = cross_val_predict(
        baseline, X, y, cv=cv
    )

    rf_predictions = cross_val_predict(
        rf, X, y, cv=cv
    )

    print(f"\n========== {label} EVALUATION ==========")
    print("Records evaluated:", len(y))

    print_metrics(
        "Mean baseline",
        y,
        baseline_predictions,
    )

    print_metrics(
        "Random Forest",
        y,
        rf_predictions,
    )

    comparison = pd.DataFrame({
        "ActualDuration": y.to_numpy(),
        "BaselinePrediction": baseline_predictions,
        "RandomForestPrediction": rf_predictions,
    })

    comparison["BaselineAbsoluteError"] = abs(
        comparison["ActualDuration"]
        - comparison["BaselinePrediction"]
    )

    comparison["RandomForestAbsoluteError"] = abs(
        comparison["ActualDuration"]
        - comparison["RandomForestPrediction"]
    )

    report_path = get_safe_path(report_path)
    comparison.round(3).to_csv(report_path, index=False)

    print("Comparison report saved:", report_path)

    return comparison


# ============================================================
# 6. MONGODB DATA AUDIT
# ============================================================

def audit_mongodb_tokens():
    if not MONGO_URI:
        raise SystemExit(
            "ERROR: MONGODB_URI was not found in backend/.env"
        )

    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=10000,
    )

    try:
        client.admin.command("ping")

        collection = client["medicube"]["tokens"]

        tokens = list(
            collection.find(
                {"status": "COMPLETED"},
                {
                    "createdAt": 1,
                    "consultationStartTime": 1,
                    "consultationEndTime": 1,
                    "status": 1,
                },
            )
        )

    finally:
        client.close()

    audit_records = []

    for token in tokens:
        token_id = str(token.get("_id", ""))

        created = token.get("createdAt")
        start = token.get("consultationStartTime")
        end = token.get("consultationEndTime")

        row = {
            "tokenId": token_id,
            "createdAt": created,
            "consultationStartTime": start,
            "consultationEndTime": end,
            "waitingTime": np.nan,
            "consultationDuration": np.nan,
            "auditStatus": "VALID",
            "auditReason": "",
        }

        if not all(
            isinstance(value, datetime)
            for value in (created, start, end)
        ):
            row["auditStatus"] = "INVALID"
            row["auditReason"] = "Missing or invalid timestamp"
            audit_records.append(row)
            continue

        try:
            waiting = (
                start - created
            ).total_seconds() / 60

            duration = (
                end - start
            ).total_seconds() / 60

        except (TypeError, ValueError, OverflowError):
            row["auditStatus"] = "INVALID"
            row["auditReason"] = "Timestamp subtraction failed"
            audit_records.append(row)
            continue

        row["waitingTime"] = waiting
        row["consultationDuration"] = duration

        if not math.isfinite(waiting) or not math.isfinite(duration):
            row["auditStatus"] = "INVALID"
            row["auditReason"] = "Non-finite duration"

        elif waiting < 0:
            row["auditStatus"] = "INVALID"
            row["auditReason"] = "Start before token creation"

        elif duration <= 0:
            row["auditStatus"] = "INVALID"
            row["auditReason"] = (
                "End not after consultation start"
            )

        elif waiting > MAX_WAITING_MINUTES:
            row["auditStatus"] = "REVIEW"
            row["auditReason"] = (
                "Waiting time exceeds review threshold"
            )

        elif duration > MAX_CONSULTATION_MINUTES:
            row["auditStatus"] = "REVIEW"
            row["auditReason"] = (
                "Consultation exceeds review threshold"
            )

        audit_records.append(row)

    if not audit_records:
        print("\nNo completed MongoDB tokens found.")
        print("MongoDB audit finished without training a model.")
        return

    audit_df = pd.DataFrame(audit_records)

    # Identify records by their verified origin.
    audit_df["recordType"] = audit_df["tokenId"].apply(
        lambda token_id:
        "TEST"
        if token_id in TEST_TOKEN_IDS
        else (
            "VERIFIED_GENUINE"
            if token_id in VERIFIED_GENUINE_TOKEN_IDS
            else "UNVERIFIED"
        )
    )

    # Only explicitly verified genuine records with valid timestamps
    # are eligible. Valid timestamps alone do not prove authenticity.
    audit_df["trainingEligible"] = (
        (audit_df["auditStatus"] == "VALID")
        & (audit_df["recordType"] == "VERIFIED_GENUINE")
        & (~audit_df["tokenId"].isin(TEST_TOKEN_IDS))
    )

    # Save the full audit, including record origin and eligibility.
    audit_path = get_safe_path(
        OUTPUT_DIR / "token_audit.csv"
    )
    audit_df.to_csv(audit_path, index=False)

    # Keep the eligible dataset separate from the full audit.
    clean_df = audit_df.loc[
        audit_df["trainingEligible"],
        ["waitingTime", "consultationDuration"],
    ].copy()

    clean_path = get_safe_path(
        OUTPUT_DIR / "cleaned_real_data.csv"
    )
    clean_df.to_csv(clean_path, index=False)

    print("\n========== MONGODB DATA AUDIT ==========")
    print("Completed tokens:", len(audit_df))
    print(
        "Timestamp-valid records:",
        int((audit_df["auditStatus"] == "VALID").sum()),
    )
    print(
        "Needs review:",
        int((audit_df["auditStatus"] == "REVIEW").sum()),
    )
    print(
        "Invalid records:",
        int((audit_df["auditStatus"] == "INVALID").sum()),
    )
    print(
        "Known test records:",
        int((audit_df["recordType"] == "TEST").sum()),
    )
    print(
        "Unverified records:",
        int((audit_df["recordType"] == "UNVERIFIED").sum()),
    )
    print(
        "Verified genuine records:",
        int(
            (audit_df["recordType"] == "VERIFIED_GENUINE").sum()
        ),
    )
    print("Eligible training records:", len(clean_df))
    print("Audit report saved:", audit_path)
    print("Eligible data saved:", clean_path)

    print("\nAudit reasons:")
    print(
        audit_df["auditReason"]
        .replace("", "Valid")
        .value_counts()
        .to_string()
    )

    # No genuine data is currently approved for training.
    if clean_df.empty:
        print(
            "\nNo explicitly verified genuine records "
            "are eligible for training."
        )
        print("Real-data model evaluation skipped.")
        print("No MongoDB candidate model was generated.")
        return

    print(
        "\nWARNING: Confirm that every approved record "
        "is genuine and suitable for use."
    )

    if len(clean_df) < MIN_RECORDS_TO_TRAIN:
        print(
            "Too few verified genuine records for "
            "the configured model comparison."
        )
        print("Real-data model evaluation skipped.")
        return

    X = clean_df[["waitingTime"]]
    y = clean_df["consultationDuration"]

    print("\nVerified genuine record statistics:")
    print(clean_df.describe().round(2).to_string())

    evaluate_models(
        X,
        y,
        LeaveOneOut(),
        "VERIFIED GENUINE MONGODB DATA",
        OUTPUT_DIR / "mongodb_prediction_comparison.csv",
    )

    # Save a new candidate file without replacing an existing one.
    model = make_random_forest()
    model.fit(X, y)

    candidate_path = get_safe_path(MONGODB_CANDIDATE_PATH)
    joblib.dump(model, candidate_path)

    print("MongoDB candidate saved:", candidate_path)


# ============================================================
# 7. SYNTHETIC DATA EXPERIMENT
# ============================================================


def evaluate_synthetic_data():
    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    if not SYNTHETIC_PATH.exists():
        print("\nSynthetic CSV not found:", SYNTHETIC_PATH)
        print("Synthetic experiment skipped.")
        return

    df = pd.read_csv(SYNTHETIC_PATH)

    required_columns = {
        "recordId",
        "dataType",
        "waitingTime",
        "priority",
        "consultationDuration",
    }

    missing = required_columns - set(df.columns)

    if missing:
        print("Missing required columns:", sorted(missing))
        print("Multi-feature experiment skipped.")
        return

    if not (df["dataType"] == "SYNTHETIC").all():
        raise SystemExit(
            "Unexpected dataType found. Experiment stopped."
        )

    df["waitingTime"] = pd.to_numeric(
        df["waitingTime"], errors="coerce"
    )
    df["consultationDuration"] = pd.to_numeric(
        df["consultationDuration"], errors="coerce"
    )

    df = df.dropna(
        subset=[
            "recordId",
            "waitingTime",
            "priority",
            "consultationDuration",
        ]
    ).copy()

    df = df[
        np.isfinite(df["waitingTime"])
        & np.isfinite(df["consultationDuration"])
        & (df["waitingTime"] >= 0)
        & (df["consultationDuration"] > 0)
        & df["priority"].isin(["NORMAL", "EMERGENCY"])
    ].copy()

    if df["recordId"].duplicated().any():
        raise SystemExit("Duplicate synthetic record IDs found.")

    if len(df) < 10:
        print("Not enough valid records for 5-fold evaluation.")
        return

    # Model A: current one-feature approach.
    X_one = df[["waitingTime"]]

    # Model B: waiting time plus priority.
    X_multi = df[["waitingTime", "priority"]]

    y = df["consultationDuration"]

    cv = KFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    # Fit categorical encoding within each training fold to
    # avoid preprocessing leakage between folds.
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "priority",
                OneHotEncoder(handle_unknown="ignore"),
                ["priority"],
            ),
        ],
        remainder="passthrough",
    )

    multi_feature_model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", make_random_forest()),
    ])

    one_feature_predictions = cross_val_predict(
        make_random_forest(),
        X_one,
        y,
        cv=cv,
    )

    multi_feature_predictions = cross_val_predict(
        multi_feature_model,
        X_multi,
        y,
        cv=cv,
    )

    baseline_predictions = cross_val_predict(
        DummyRegressor(strategy="mean"),
        X_one,
        y,
        cv=cv,
    )

    print("\n========== SYNTHETIC FEATURE EXPERIMENT ==========")
    print("Synthetic records evaluated:", len(df))
    print("Features A: waitingTime")
    print("Features B: waitingTime + priority")

    print_metrics("Mean baseline", y, baseline_predictions)
    print_metrics("Model A: waitingTime", y, one_feature_predictions)
    print_metrics(
        "Model B: waitingTime + priority",
        y,
        multi_feature_predictions,
    )

    report = pd.DataFrame({
        "recordId": df["recordId"].to_numpy(),
        "ActualDuration": y.to_numpy(),
        "BaselinePrediction": baseline_predictions,
        "OneFeaturePrediction": one_feature_predictions,
        "MultiFeaturePrediction": multi_feature_predictions,
        "Priority": df["priority"].to_numpy(),
    })

    report_path = get_safe_path(
        OUTPUT_DIR / "synthetic_feature_comparison.csv"
    )
    report.round(3).to_csv(report_path, index=False)
    print("Feature comparison report saved:", report_path)

    # Save a separate experimental candidate.
    # Never replace model.pkl or any existing candidate.
    multi_feature_model.fit(X_multi, y)

    candidate_path = get_safe_path(
        BASE_DIR / "model_candidate_priority_experiment.pkl"
    )
    joblib.dump(multi_feature_model, candidate_path)

    print("Experimental candidate saved:", candidate_path)
    print(
        "Synthetic-only experiment: results do not establish "
        "real-world clinical prediction accuracy."
    )
    print("Active model.pkl was not changed.")


# ============================================================
# 8. TIME CALCULATION TESTS
# ============================================================

def check_time_calculations():
    start = datetime(2026, 1, 1, 10, 0, 0)

    assert (
        (start + timedelta(minutes=15) - start)
        .total_seconds() / 60
    ) == 15

    assert (
        (start + timedelta(hours=1) - start)
        .total_seconds() / 60
    ) == 60

    assert (
        (start + timedelta(hours=50) - start)
        .total_seconds() / 60
    ) == 3000

    print("\nTime calculation tests: PASS")


# ============================================================
# 9. MAIN WORKFLOW
# ============================================================

if __name__ == "__main__":
    print("============================================")
    print("MEDICUBE ML TRAINING AND DATA AUDIT")
    print("============================================")

    check_time_calculations()

    audit_mongodb_tokens()

    evaluate_synthetic_data()

    print("\n========== TRAINING WORKFLOW FINISHED ==========")
    print("Active model.pkl was not changed.")
    print("Existing model_candidate.pkl was not changed.")
    print("Existing candidate models are preserved.")
    print("Existing audit and comparison reports are preserved.")
    print("Review the reports before selecting a model.")
