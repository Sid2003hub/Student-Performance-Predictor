"""CLI prediction helper retained for local/offline use.
Production Vercel requests use api/index.py directly and do not spawn Python processes.
"""
import os
import sys
from pathlib import Path

import joblib
import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"


def predict(values):
    model = joblib.load(MODEL_PATH)
    data = np.array([values], dtype=float)
    prediction = int(model.predict(data)[0])
    confidence = float(np.max(model.predict_proba(data)[0])) * 100
    return ("Pass" if prediction == 1 else "Fail", round(confidence, 2))


if __name__ == "__main__":
    if len(sys.argv) != 6:
        raise SystemExit("Usage: python predict.py attendance studyHours previousMarks internalMarks assignments")
    values = [float(value) for value in sys.argv[1:]]
    result, confidence = predict(values)
    print(f"{result},{confidence}")
