# AI Student Performance Predictor — Vercel Production Setup

This version is prepared for a **single Vercel deployment** with a static frontend, a Flask/Python API, the existing Random Forest model, and MongoDB.

## Project structure

```text
AI-Student-Performance-Predictor/
├── api/
│   └── index.py                 # Vercel Flask API
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── prediction.html
│   ├── result.html
│   ├── script.js
│   └── style.css
├── ml_model/
│   ├── model.pkl
│   ├── predict.py
│   └── train_model.py
├── dataset/
│   └── students.csv
├── .env.example
├── .gitignore
├── .python-version
├── package.json
├── pyproject.toml
├── requirements.txt
└── vercel.json
```

## 1. Configure MongoDB and JWT secret

Do **not** commit a real `.env` file. Add these variables in **Vercel → Project → Settings → Environment Variables**:

```text
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret>
APP_DEBUG=false
```

If you use MongoDB Atlas, make sure the database user exists and its network access rules allow your deployment to connect.

## 2. Deploy

### Vercel dashboard

1. Push this folder to GitHub (without `.env`).
2. Import the repository into Vercel.
3. Keep **Root Directory = `./`**.
4. No frontend build command is required.
5. Add `MONGO_URI` and `JWT_SECRET` as environment variables.
6. Deploy.

### Vercel CLI

From this project folder:

```bash
npx vercel login
npx vercel
npx vercel --prod
```

## 3. Test after deployment

Open:

```text
https://YOUR-DOMAIN.vercel.app/
```

API health check:

```text
https://YOUR-DOMAIN.vercel.app/api/health
```

The response should include `"status":"ok"`. If MongoDB is configured and reachable, the database status should be `connected`.

## 4. Local development

Use Python 3.12.

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python api/index.py
```

The API runs at `http://localhost:5000` when started directly. For the closest match to Vercel's routing, install/use the Vercel CLI and run:

```bash
npx vercel dev
```

## Production notes

- Frontend API requests use same-origin `/api/...` paths; there are no hard-coded `localhost` URLs.
- The Vercel API does not spawn a local Windows Python executable.
- Prediction inputs are validated on the server.
- Passwords are hashed before being stored.
- JWT authentication protects dashboard, prediction, and history endpoints.
- Prediction history is associated with the logged-in user.
- API responses are configured not to be cached.
- The real MongoDB URI is intentionally excluded from the project. Configure it in Vercel.
