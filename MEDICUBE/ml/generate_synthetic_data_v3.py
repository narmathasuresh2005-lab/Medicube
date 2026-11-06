
from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "data_audit"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "synthetic_consultation_data_v3.csv"

# Reproducible synthetic experiment
rng = np.random.default_rng(43)
N = 300

# Invented waiting times
base_wait = rng.gamma(shape=2.5, scale=6.0, size=N)

low, high = -100.0, 100.0
for _ in range(100):
    shift = (low + high) / 2
    waits = np.clip(base_wait + shift, 2.0, 45.0)

    if waits.mean() < 15.0:
        low = shift
    else:
        high = shift

waiting_times = np.clip(
    base_wait + (low + high) / 2,
    2.0,
    45.0,
)

priorities = rng.choice(
    ["NORMAL", "EMERGENCY"],
    size=N,
    p=[0.90, 0.10],
)

specializations = rng.choice(
    ["General Medicine", "Pediatrics", "Cardiology"],
    size=N,
)

# Demonstration assumptions only—not clinical rules.
specialty_effect = {
    "General Medicine": 0.0,
    "Pediatrics": 1.5,
    "Cardiology": 3.0,
}

priority_effect = np.where(
    priorities == "EMERGENCY",
    1.0,
    0.0,
)

noise = rng.normal(0, 2.5, N)

durations = np.clip(
    7.0
    + 0.18 * waiting_times
    + np.array([specialty_effect[s] for s in specializations])
    + priority_effect
    + noise,
    3.0,
    25.0,
)

df = pd.DataFrame({
    "recordId": [
        f"SYNTH-V3-{i:04d}" for i in range(1, N + 1)
    ],
    "dataType": ["SYNTHETIC"] * N,
    "waitingTime": np.round(waiting_times, 2),
    "priority": priorities,
    "specialization": specializations,
    "consultationDuration": np.round(durations, 2),
})

# Never overwrite an existing file.
if OUTPUT_FILE.exists():
    raise SystemExit(
        f"File already exists; nothing overwritten:\n{OUTPUT_FILE}"
    )

df.to_csv(OUTPUT_FILE, index=False)

print("Synthetic V3 dataset created successfully.")
print("Records:", len(df))
print("Saved to:", OUTPUT_FILE)
print("\nSpecialization counts:")
print(df["specialization"].value_counts().to_string())
print("\nAverage duration by specialization:")
print(
    df.groupby("specialization")["consultationDuration"]
    .mean()
    .round(2)
    .to_string()
)
print("\nMissing values:", int(df.isnull().sum().sum()))
print(
    "\nReminder: This is invented data for software experiments, "
    "not evidence of real-world clinical prediction accuracy."
)
