import joblib
import pandas as pd
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "model.pkl")

model = joblib.load(model_path)

data = pd.DataFrame([{
    "Attendance": float(sys.argv[1]),
    "StudyHours": float(sys.argv[2]),
    "PreviousMarks": float(sys.argv[3]),
    "InternalMarks": float(sys.argv[4]),
    "Assignments": float(sys.argv[5])
}])

prediction = model.predict(data)

confidence = model.predict_proba(data)

percentage = round(max(confidence[0]) * 100, 2)

if prediction[0] == 1:
    print(f"Pass,{percentage}")
else:
    print(f"Fail,{percentage}")