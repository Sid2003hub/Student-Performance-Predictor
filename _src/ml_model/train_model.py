from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = ROOT / "dataset" / "students.csv"
MODEL_PATH = ROOT / "ml_model" / "model.pkl"


data = pd.read_csv(DATASET_PATH)
data["Result"] = data["Result"].map({"Pass": 1, "Fail": 0})

features = ["Attendance", "StudyHours", "PreviousMarks", "InternalMarks", "Assignments"]
X = data[features]
y = data["Result"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

accuracy = accuracy_score(y_test, model.predict(X_test))
print(f"Model Accuracy: {accuracy * 100:.2f}%")
joblib.dump(model, MODEL_PATH)
print(f"Model saved successfully: {MODEL_PATH}")
