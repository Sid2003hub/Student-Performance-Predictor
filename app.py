
import os
import warnings
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

import joblib
import jwt
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from pymongo import ASCENDING, MongoClient
from werkzeug.security import check_password_hash, generate_password_hash

warnings.filterwarnings(
    "ignore",
    message="X does not have valid feature names"
)

# ============================================================
# APP CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "ml_model" / "model.pkl"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024


# ============================================================
# GLOBAL CONNECTIONS
# ============================================================

_model = None
_mongo_client = None
_db = None


# ============================================================
# ML MODEL
# ============================================================

def get_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(
                f"ML model not found at {MODEL_PATH}"
            )

        _model = joblib.load(MODEL_PATH)

    return _model


# ============================================================
# MONGODB
# ============================================================

def get_db():
    global _mongo_client, _db

    if _db is not None:
        return _db

    uri = os.getenv("MONGO_URI")

    if not uri:
        raise RuntimeError(
            "MONGO_URI environment variable is not configured"
        )

    _mongo_client = MongoClient(
        uri,
        serverSelectionTimeoutMS=5000
    )

    _db = _mongo_client.get_default_database()

    if _db is None:
        raise RuntimeError(
            "MONGO_URI must include a database name"
        )

    # Create indexes only when database is first accessed.
    _db.users.create_index(
        [("email", ASCENDING)],
        unique=True
    )

    _db.predictions.create_index(
        [("createdAt", -1)]
    )

    return _db


# ============================================================
# JWT
# ============================================================

def get_secret():
    secret = os.getenv("JWT_SECRET")

    if not secret:
        raise RuntimeError(
            "JWT_SECRET environment variable is not configured"
        )

    return secret


def make_token(user_id, email):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=24),
    }

    return jwt.encode(
        payload,
        get_secret(),
        algorithm="HS256"
    )


# ============================================================
# AUTH DECORATOR
# ============================================================

def require_auth(fn):

    @wraps(fn)
    def wrapper(*args, **kwargs):

        header = request.headers.get(
            "Authorization",
            ""
        )

        if not header.startswith("Bearer "):
            return jsonify({
                "error": "Authentication required"
            }), 401

        token = header[7:].strip()

        try:
            payload = jwt.decode(
                token,
                get_secret(),
                algorithms=["HS256"]
            )

            request.user = payload

        except jwt.ExpiredSignatureError:

            return jsonify({
                "error": "Session expired. Please login again."
            }), 401

        except jwt.InvalidTokenError:

            return jsonify({
                "error": "Invalid authentication token"
            }), 401

        return fn(*args, **kwargs)

    return wrapper


# ============================================================
# HELPERS
# ============================================================

def clean_email(value):
    return str(value or "").strip().lower()


def validate_prediction_input(data):

    fields = [
        ("attendance", 0, 100),
        ("studyHours", 0, 24),
        ("previousMarks", 0, 100),
        ("internalMarks", 0, 100),
        ("assignments", 0, 100),
    ]

    cleaned = {}
    errors = {}

    if not isinstance(data, dict):

        return None, {
            "body": "Request body must be a JSON object"
        }

    # Student name
    name = str(
        data.get("name", "")
    ).strip()

    if not name or len(name) > 100:

        errors["name"] = (
            "Student name is required and must be "
            "at most 100 characters"
        )

    else:
        cleaned["name"] = name

    # Numeric fields
    for field, minimum, maximum in fields:

        value = data.get(field)

        try:
            number = float(value)

        except (TypeError, ValueError):

            errors[field] = "Must be a valid number"
            continue

        if not np.isfinite(number):

            errors[field] = "Must be a finite number"
            continue

        if number < minimum or number > maximum:

            errors[field] = (
                f"Must be between {minimum} and {maximum}"
            )
            continue

        cleaned[field] = number

    if errors:
        return None, errors

    return cleaned, {}


# ============================================================
# SECURITY HEADERS
# ============================================================

@app.after_request
def add_security_headers(response):

    response.headers["X-Content-Type-Options"] = "nosniff"

    response.headers["X-Frame-Options"] = "DENY"

    response.headers["Referrer-Policy"] = (
        "strict-origin-when-cross-origin"
    )

    if request.path.startswith("/api/"):

        response.headers["Cache-Control"] = "no-store"

    return response


# ============================================================
# FRONTEND FILE ROUTES
# ============================================================

@app.route("/")
def home():

    return send_from_directory(
        BASE_DIR,
        "index.html"
    )


@app.route("/login.html")
def login_page():

    return send_from_directory(
        BASE_DIR,
        "login.html"
    )


@app.route("/register.html")
def register_page():

    return send_from_directory(
        BASE_DIR,
        "register.html"
    )


@app.route("/dashboard.html")
def dashboard_page():

    return send_from_directory(
        BASE_DIR,
        "dashboard.html"
    )


@app.route("/prediction.html")
def prediction_page():

    return send_from_directory(
        BASE_DIR,
        "prediction.html"
    )


@app.route("/result.html")
def result_page():

    return send_from_directory(
        BASE_DIR,
        "result.html"
    )


@app.route("/style.css")
def stylesheet():

    return send_from_directory(
        BASE_DIR,
        "style.css"
    )


@app.route("/script.js")
def javascript():

    return send_from_directory(
        BASE_DIR,
        "script.js"
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():

    db_status = "not_configured"

    try:

        db = get_db()
        db.command("ping")
        db_status = "connected"

    except Exception:

        if os.getenv("MONGO_URI"):
            db_status = "unavailable"

    return jsonify({
        "status": "ok",
        "service": "AI Student Performance Predictor",
        "modelLoaded": MODEL_PATH.exists(),
        "database": db_status
    })


# ============================================================
# REGISTER
# ============================================================

@app.route(
    "/api/auth/register",
    methods=["POST"]
)
def register():

    data = request.get_json(
        silent=True
    ) or {}

    email = clean_email(
        data.get("email")
    )

    password = str(
        data.get("password", "")
    )

    name = str(
        data.get("name", "")
    ).strip()

    # Validate name
    if not name or len(name) > 100:

        return jsonify({
            "error": (
                "Name is required and must be "
                "at most 100 characters"
            )
        }), 400

    # Validate email
    if "@" not in email or len(email) > 254:

        return jsonify({
            "error": "Enter a valid email address"
        }), 400

    # Validate password
    if len(password) < 8 or len(password) > 128:

        return jsonify({
            "error": (
                "Password must be between "
                "8 and 128 characters"
            )
        }), 400

    try:

        db = get_db()

        existing = db.users.find_one(
            {"email": email},
            {"_id": 1}
        )

        if existing:

            return jsonify({
                "error": (
                    "An account with this email "
                    "already exists"
                )
            }), 409

        result = db.users.insert_one({

            "name": name,

            "email": email,

            "passwordHash":
                generate_password_hash(password),

            "createdAt":
                datetime.now(timezone.utc)
        })

        token = make_token(
            result.inserted_id,
            email
        )

        return jsonify({

            "message":
                "Account created successfully",

            "token":
                token,

            "user": {
                "name": name,
                "email": email
            }

        }), 201

    except Exception as exc:

        app.logger.exception(
            "Registration failed"
        )

        details = (
            str(exc)
            if os.getenv("APP_DEBUG") == "true"
            else None
        )

        return jsonify({

            "error":
                "Unable to create account",

            "details":
                details

        }), 500


# ============================================================
# LOGIN
# ============================================================

@app.route(
    "/api/auth/login",
    methods=["POST"]
)
def login():

    data = request.get_json(
        silent=True
    ) or {}

    email = clean_email(
        data.get("email")
    )

    password = str(
        data.get("password", "")
    )

    if not email or not password:

        return jsonify({
            "error":
                "Email and password are required"
        }), 400

    try:

        db = get_db()

        user = db.users.find_one({
            "email": email
        })

        if not user:

            return jsonify({
                "error":
                    "Invalid email or password"
            }), 401

        password_hash = user.get(
            "passwordHash",
            ""
        )

        if not check_password_hash(
            password_hash,
            password
        ):

            return jsonify({
                "error":
                    "Invalid email or password"
            }), 401

        token = make_token(
            user["_id"],
            user["email"]
        )

        return jsonify({

            "message":
                "Login successful",

            "token":
                token,

            "user": {
                "name":
                    user.get(
                        "name",
                        "Student"
                    ),

                "email":
                    user["email"]
            }

        })

    except Exception:

        app.logger.exception(
            "Login failed"
        )

        return jsonify({
            "error":
                "Unable to login right now"
        }), 500


# ============================================================
# CURRENT USER
# ============================================================

@app.route(
    "/api/auth/me",
    methods=["GET"]
)
@require_auth
def me():

    try:

        db = get_db()

        user = db.users.find_one(
            {
                "email":
                    request.user["email"]
            },
            {
                "name": 1,
                "email": 1
            }
        )

        if not user:

            return jsonify({
                "error": "User not found"
            }), 404

        return jsonify({

            "user": {
                "name":
                    user.get(
                        "name",
                        "Student"
                    ),

                "email":
                    user["email"]
            }

        })

    except Exception:

        app.logger.exception(
            "User lookup failed"
        )

        return jsonify({
            "error":
                "Unable to load user"
        }), 500


# ============================================================
# PREDICTION
# ============================================================

@app.route(
    "/api/student/predict",
    methods=["POST"]
)
@require_auth
def predict():

    data = request.get_json(
        silent=True
    )

    cleaned, errors = validate_prediction_input(
        data
    )

    if errors:

        return jsonify({

            "error":
                "Validation failed",

            "fields":
                errors

        }), 400

    try:

        model = get_model()

        features = pd.DataFrame([
            {
                "Attendance":
                    cleaned["attendance"],

                "StudyHours":
                    cleaned["studyHours"],

                "PreviousMarks":
                    cleaned["previousMarks"],

                "InternalMarks":
                    cleaned["internalMarks"],

                "Assignments":
                    cleaned["assignments"],
            }
        ])

        prediction_value = int(
            model.predict(features)[0]
        )

        probabilities = model.predict_proba(
            features
        )[0]

        confidence = round(
            float(np.max(probabilities)) * 100,
            2
        )

        prediction = (
            "Pass"
            if prediction_value == 1
            else "Fail"
        )

        db = get_db()

        doc = {

            "userId":
                request.user["sub"],

            **cleaned,

            "prediction":
                prediction,

            "confidence":
                confidence,

            "createdAt":
                datetime.now(timezone.utc)
        }

        db.predictions.insert_one(doc)

        return jsonify({

            "prediction":
                prediction,

            "confidence":
                confidence
        })

    except Exception as exc:

        app.logger.exception(
            "Prediction failed"
        )

        details = (
            str(exc)
            if os.getenv("APP_DEBUG") == "true"
            else None
        )

        return jsonify({

            "error":
                "Prediction failed",

            "details":
                details

        }), 500


# ============================================================
# PREDICTION HISTORY
# ============================================================

@app.route(
    "/api/student/history",
    methods=["GET"]
)
@require_auth
def history():

    try:

        db = get_db()

        records = list(

            db.predictions.find(
                {
                    "userId":
                        request.user["sub"]
                },
                {
                    "_id": 0
                }
            )
            .sort(
                "createdAt",
                -1
            )
            .limit(20)
        )

        for record in records:

            if isinstance(
                record.get("createdAt"),
                datetime
            ):

                record["createdAt"] = (
                    record["createdAt"]
                    .isoformat()
                )

        return jsonify({

            "predictions":
                records

        })

    except Exception:

        app.logger.exception(
            "History lookup failed"
        )

        return jsonify({
            "error":
                "Unable to load prediction history"
        }), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(413)
def too_large(_error):

    return jsonify({
        "error":
            "Request body is too large"
    }), 413


@app.errorhandler(404)
def not_found(_error):

    if request.path.startswith("/api/"):

        return jsonify({
            "error":
                "API endpoint not found"
        }), 404

    return jsonify({
        "error":
            "Page not found"
    }), 404


@app.errorhandler(500)
def internal_error(_error):

    return jsonify({
        "error":
            "Internal server error"
    }), 500


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(
            os.getenv(
                "PORT",
                "5000"
            )
        ),
        debug=(
            os.getenv(
                "APP_DEBUG"
            ) == "true"
        )
    )
