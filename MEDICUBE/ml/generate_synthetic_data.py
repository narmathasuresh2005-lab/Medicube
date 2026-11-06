
from pathlib import Path

import numpy as np
import pandas as pd

# Keep the original dataset untouched.
OUTPUT_DIR = Path(__file__).resolve().parent / "data_audit"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "synthetic_consultation_data_v2.csv"

rng = np.random.default_rng(42)
N = 200

# Generate waiting times between 2 and 45 minutes.
# Adjust the distribution so its average is 15 minutes.
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
    base_wait + (low + high) / 2, 2.0, 45.0
)

# DEMONSTRATION ASSUMPTION ONLY:
# Simulated consultation duration has a modest relationship
# with waiting time. This is not a validated clinical rule.
durations = np.clip(
    7.0 + 0.18 * waiting_times
    + rng.normal(0, 2.5, N),
    3.0,
    25.0,
)

# Generate internally consistent timestamps for each record.
# Overlapping appointments can occur because this is simulated
# multi-patient data, not a reconstruction of a real clinic day.
start_date = pd.Timestamp("2026-10-01 09:00:00")

created_times = [
    start_date + pd.Timedelta(minutes=5 * i)
    for i in range(N)
]

start_times = [
    created + pd.Timedelta(minutes=float(wait))
    for created, wait in zip(created_times, waiting_times)
]

end_times = [
    started + pd.Timedelta(minutes=float(duration))
    for started, duration in zip(start_times, durations)
]

priorities = rng.choice(
    ["NORMAL", "EMERGENCY"],
    size=N,
    p=[0.90, 0.10],
)

df = pd.DataFrame({
    "recordId": [f"SYNTH-V2-{i:04d}" for i in range(1, N + 1)],
    "dataType": ["SYNTHETIC"] * N,
    "tokenNumber": range(1, N + 1),
    "priority": priorities,
    "createdAt": created_times,
    "consultationStartTime": start_times,
    "consultationEndTime": end_times,
    "waitingTime": np.round(waiting_times, 2),
    "consultationDuration": np.round(durations, 2),
})

# Save as a new file; never overwrite the original.
df.to_csv(OUTPUT_FILE, index=False)

print("New synthetic dataset created.")
print("File:", OUTPUT_FILE)
print("Records:", len(df))
print("Average waiting time:", round(df["waitingTime"].mean(), 2), "minutes")
print(
    "Waiting time range:",
    round(df["waitingTime"].min(), 2),
    "to",
    round(df["waitingTime"].max(), 2),
    "minutes",
)
print(
    "Average consultation duration:",
    round(df["consultationDuration"].mean(), 2),
    "minutes",
)
print(
    "Correlation:",
    round(df["waitingTime"].corr(df["consultationDuration"]), 3),
)
print("Missing values:", int(df.isnull().sum().sum()))
