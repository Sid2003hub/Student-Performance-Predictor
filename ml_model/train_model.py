import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Load Dataset
data = pd.read_csv("../dataset/students.csv")

# Convert Pass/Fail to numbers
data["Result"] = data["Result"].map({
    "Pass": 1,
    "Fail": 0
})

# Features
X = data[[
    "Attendance",
    "StudyHours",
    "PreviousMarks",
    "InternalMarks",
    "Assignments"
]]

# Target
y = data["Result"]

# Split Data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# Create Model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

# Train Model
model.fit(X_train, y_train)

# Predict
predictions = model.predict(X_test)

# Accuracy
accuracy = accuracy_score(y_test, predictions)

print(f"Model Accuracy: {accuracy * 100:.2f}%")

# Save Model
joblib.dump(model, "model.pkl")

print("Model saved successfully as model.pkl")