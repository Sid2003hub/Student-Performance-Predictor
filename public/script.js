const API_BASE = "/api";

const TOKEN_KEY = "studentPredictorToken";
const USER_KEY = "studentPredictorUser";

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
        return null;
    }
}

async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};

    if (!response.ok) {
        if (response.status === 401) clearSession();
        throw new Error(data.error || "Something went wrong. Please try again.");
    }
    return data;
}

function requireLogin() {
    if (!getToken()) {
        window.location.href = "/login.html";
        return false;
    }
    return true;
}

function showMessage(element, message, type = "error") {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
    element.hidden = false;
}

function setLoading(button, loading, text) {
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : text;
}

// Landing page
const startBtn = document.getElementById("startBtn");
if (startBtn) {
    startBtn.addEventListener("click", () => {
        window.location.href = getToken() ? "/dashboard.html" : "/login.html";
    });
}

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    const message = document.getElementById("loginMessage");
    const button = loginForm.querySelector("button[type='submit']");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage(message, "", "success");
        message.hidden = true;
        setLoading(button, true, "Login");

        try {
            const data = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: document.getElementById("email").value.trim(),
                    password: document.getElementById("password").value,
                }),
            });
            saveSession(data);
            window.location.href = "/dashboard.html";
        } catch (error) {
            showMessage(message, error.message);
        } finally {
            setLoading(button, false, "Login");
        }
    });
}

// Register
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    const message = document.getElementById("registerMessage");
    const button = registerForm.querySelector("button[type='submit']");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;
        setLoading(button, true, "Create Account");

        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            showMessage(message, "Passwords do not match.");
            setLoading(button, false, "Create Account");
            return;
        }

        try {
            const data = await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: document.getElementById("name").value.trim(),
                    email: document.getElementById("email").value.trim(),
                    password,
                }),
            });
            saveSession(data);
            window.location.href = "/dashboard.html";
        } catch (error) {
            showMessage(message, error.message);
        } finally {
            setLoading(button, false, "Create Account");
        }
    });
}

// Logout links
for (const logout of document.querySelectorAll("[data-logout]")) {
    logout.addEventListener("click", (event) => {
        event.preventDefault();
        clearSession();
        window.location.href = "/";
    });
}

// Dashboard guard + user information + recent history
if (document.body.dataset.authRequired === "true") {
    requireLogin();
}

const userName = document.getElementById("userName");
if (userName) {
    const user = getUser();
    userName.textContent = user?.name || "Student";
}

const historyList = document.getElementById("historyList");
if (historyList && getToken()) {
    apiFetch("/student/history")
        .then((data) => {
            if (!data.predictions?.length) {
                historyList.innerHTML = '<p class="muted">No predictions yet. Start your first prediction.</p>';
                return;
            }

            historyList.innerHTML = data.predictions.map((item) => `
                <div class="history-item">
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <span>${new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="history-result ${item.prediction.toLowerCase()}">
                        ${escapeHtml(item.prediction)} · ${Number(item.confidence).toFixed(2)}%
                    </div>
                </div>
            `).join("");
        })
        .catch((error) => {
            historyList.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
        });
}

// Prediction form
const predictionForm = document.getElementById("predictionForm");
if (predictionForm) {
    if (!requireLogin()) {
        // The redirect above will take the user to login.
    } else {
        const message = document.getElementById("predictionMessage");
        const button = predictionForm.querySelector("button[type='submit']");

        predictionForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            message.hidden = true;
            setLoading(button, true, "Predict Result");

            const studentData = {
                name: document.getElementById("name").value.trim(),
                attendance: Number(document.getElementById("attendance").value),
                studyHours: Number(document.getElementById("studyHours").value),
                previousMarks: Number(document.getElementById("previousMarks").value),
                internalMarks: Number(document.getElementById("internalMarks").value),
                assignments: Number(document.getElementById("assignments").value),
            };

            try {
                const result = await apiFetch("/student/predict", {
                    method: "POST",
                    body: JSON.stringify(studentData),
                });

                localStorage.setItem("prediction", result.prediction);
                localStorage.setItem("confidence", result.confidence);
                localStorage.setItem("studentName", studentData.name);
                window.location.href = "/result.html";
            } catch (error) {
                showMessage(message, error.message);
            } finally {
                setLoading(button, false, "Predict Result");
            }
        });
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
