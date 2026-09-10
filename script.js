
// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE = "/api";

const TOKEN_KEY = "studentPredictorToken";
const USER_KEY = "studentPredictorUser";


// ============================================================
// SESSION HELPERS
// ============================================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}


function saveSession(data) {

    if (data?.token) {
        localStorage.setItem(
            TOKEN_KEY,
            data.token
        );
    }

    if (data?.user) {
        localStorage.setItem(
            USER_KEY,
            JSON.stringify(data.user)
        );
    }
}


function clearSession() {

    localStorage.removeItem(TOKEN_KEY);

    localStorage.removeItem(USER_KEY);

    localStorage.removeItem("prediction");

    localStorage.removeItem("confidence");

    localStorage.removeItem("studentName");
}


function getUser() {

    try {

        return JSON.parse(
            localStorage.getItem(USER_KEY) || "null"
        );

    } catch {

        return null;
    }
}


// ============================================================
// API REQUEST HELPER
// ============================================================

async function apiFetch(
    path,
    options = {}
) {

    const headers = {
        ...(options.headers || {})
    };

    if (
        options.body &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";
    }

    const token = getToken();

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...options,
            headers
        }
    );

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    let data = {};

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            data = await response.json();

        } catch {

            data = {};
        }
    }

    if (!response.ok) {

        if (response.status === 401) {

            clearSession();
        }

        throw new Error(
            data.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


// ============================================================
// LOGIN GUARD
// ============================================================

function requireLogin() {

    if (!getToken()) {

        window.location.href =
            "/login.html";

        return false;
    }

    return true;
}


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    element,
    message,
    type = "error"
) {

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        `form-message ${type}`;

    element.hidden = false;
}


// ============================================================
// BUTTON LOADING
// ============================================================

function setLoading(
    button,
    loading,
    text
) {

    if (!button) {
        return;
    }

    button.disabled = loading;

    button.textContent =
        loading
            ? "Please wait..."
            : text;
}


// ============================================================
// SAFE HTML
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// LANDING PAGE
// ============================================================

const startBtn =
    document.getElementById(
        "startBtn"
    );

if (startBtn) {

    startBtn.addEventListener(
        "click",
        () => {

            if (getToken()) {

                window.location.href =
                    "/dashboard.html";

            } else {

                window.location.href =
                    "/login.html";
            }
        }
    );
}


// ============================================================
// LOGIN
// ============================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );

if (loginForm) {

    const message =
        document.getElementById(
            "loginMessage"
        );

    const button =
        loginForm.querySelector(
            "button[type='submit']"
        );

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (message) {
                message.hidden = true;
            }

            setLoading(
                button,
                true,
                "Login"
            );

            const email =
                document.getElementById(
                    "email"
                ).value.trim();

            const password =
                document.getElementById(
                    "password"
                ).value;

            if (!email || !password) {

                showMessage(
                    message,
                    "Email and password are required."
                );

                setLoading(
                    button,
                    false,
                    "Login"
                );

                return;
            }

            try {

                const data =
                    await apiFetch(
                        "/auth/login",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    email,
                                    password
                                })
                        }
                    );

                saveSession(data);

                window.location.href =
                    "/dashboard.html";

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showMessage(
                    message,
                    error.message
                );

            } finally {

                setLoading(
                    button,
                    false,
                    "Login"
                );
            }
        }
    );
}


// ============================================================
// REGISTER
// ============================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );

if (registerForm) {

    const message =
        document.getElementById(
            "registerMessage"
        );

    const button =
        registerForm.querySelector(
            "button[type='submit']"
        );

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (message) {
                message.hidden = true;
            }

            setLoading(
                button,
                true,
                "Create Account"
            );

            const name =
                document.getElementById(
                    "name"
                ).value.trim();

            const email =
                document.getElementById(
                    "email"
                ).value.trim();

            const password =
                document.getElementById(
                    "password"
                ).value;

            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;

            if (!name) {

                showMessage(
                    message,
                    "Please enter your name."
                );

                setLoading(
                    button,
                    false,
                    "Create Account"
                );

                return;
            }

            if (!email) {

                showMessage(
                    message,
                    "Please enter your email."
                );

                setLoading(
                    button,
                    false,
                    "Create Account"
                );

                return;
            }

            if (password.length < 8) {

                showMessage(
                    message,
                    "Password must contain at least 8 characters."
                );

                setLoading(
                    button,
                    false,
                    "Create Account"
                );

                return;
            }

            if (
                password !==
                confirmPassword
            ) {

                showMessage(
                    message,
                    "Passwords do not match."
                );

                setLoading(
                    button,
                    false,
                    "Create Account"
                );

                return;
            }

            try {

                const data =
                    await apiFetch(
                        "/auth/register",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    name,
                                    email,
                                    password
                                })
                        }
                    );

                saveSession(data);

                window.location.href =
                    "/dashboard.html";

            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );

                showMessage(
                    message,
                    error.message
                );

            } finally {

                setLoading(
                    button,
                    false,
                    "Create Account"
                );
            }
        }
    );
}


// ============================================================
// LOGOUT
// ============================================================

document
    .querySelectorAll(
        "[data-logout]"
    )
    .forEach(
        (logout) => {

            logout.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    clearSession();

                    window.location.href =
                        "/";
                }
            );
        }
    );


// ============================================================
// AUTHENTICATED PAGES
// ============================================================

if (
    document.body?.dataset
        .authRequired === "true"
) {

    requireLogin();
}


// ============================================================
// USER NAME
// ============================================================

const userName =
    document.getElementById(
        "userName"
    );

if (userName) {

    const user = getUser();

    userName.textContent =
        user?.name || "Student";
}


// ============================================================
// DASHBOARD HISTORY
// ============================================================

const historyList =
    document.getElementById(
        "historyList"
    );

if (
    historyList &&
    getToken()
) {

    apiFetch(
        "/student/history"
    )
        .then(
            (data) => {

                const predictions =
                    Array.isArray(
                        data.predictions
                    )
                        ? data.predictions
                        : [];

                if (
                    predictions.length === 0
                ) {

                    historyList.innerHTML =
                        '<p class="muted">No predictions yet. Start your first prediction.</p>';

                    return;
                }

                historyList.innerHTML =
                    predictions
                        .map(
                            (item) => {

                                const prediction =
                                    String(
                                        item.prediction ??
                                        ""
                                    );

                                const confidence =
                                    Number(
                                        item.confidence ??
                                        0
                                    );

                                const createdAt =
                                    item.createdAt
                                        ? new Date(
                                            item.createdAt
                                        ).toLocaleString()
                                        : "Unknown date";

                                return `
                                    <div class="history-item">
                                        <div>
                                            <strong>
                                                ${escapeHtml(
                                                    item.name ||
                                                    "Student"
                                                )}
                                            </strong>

                                            <span>
                                                ${escapeHtml(
                                                    createdAt
                                                )}
                                            </span>
                                        </div>

                                        <div class="history-result ${escapeHtml(
                                            prediction.toLowerCase()
                                        )}">
                                            ${escapeHtml(
                                                prediction
                                            )}
                                            ·
                                            ${confidence.toFixed(
                                                2
                                            )}%
                                        </div>
                                    </div>
                                `;
                            }
                        )
                        .join("");
            }
        )
        .catch(
            (error) => {

                historyList.innerHTML =
                    `<p class="muted">${escapeHtml(
                        error.message
                    )}</p>`;
            }
        );
}


// ============================================================
// PREDICTION FORM
// ============================================================

const predictionForm =
    document.getElementById(
        "predictionForm"
    );

if (predictionForm) {

    if (!requireLogin()) {

        // User will be redirected to login.

    } else {

        const message =
            document.getElementById(
                "predictionMessage"
            );

        const button =
            predictionForm.querySelector(
                "button[type='submit']"
            );

        predictionForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                if (message) {
                    message.hidden = true;
                }

                setLoading(
                    button,
                    true,
                    "Predict Result"
                );

                const studentData = {

                    name:
                        document.getElementById(
                            "name"
                        ).value.trim(),

                    attendance:
                        Number(
                            document.getElementById(
                                "attendance"
                            ).value
                        ),

                    studyHours:
                        Number(
                            document.getElementById(
                                "studyHours"
                            ).value
                        ),

                    previousMarks:
                        Number(
                            document.getElementById(
                                "previousMarks"
                            ).value
                        ),

                    internalMarks:
                        Number(
                            document.getElementById(
                                "internalMarks"
                            ).value
                        ),

                    assignments:
                        Number(
                            document.getElementById(
                                "assignments"
                            ).value
                        )
                };

                if (!studentData.name) {

                    showMessage(
                        message,
                        "Please enter the student name."
                    );

                    setLoading(
                        button,
                        false,
                        "Predict Result"
                    );

                    return;
                }

                try {

                    const result =
                        await apiFetch(
                            "/student/predict",
                            {
                                method: "POST",

                                body:
                                    JSON.stringify(
                                        studentData
                                    )
                            }
                        );

                    localStorage.setItem(
                        "prediction",
                        result.prediction
                    );

                    localStorage.setItem(
                        "confidence",
                        result.confidence
                    );

                    localStorage.setItem(
                        "studentName",
                        studentData.name
                    );

                    window.location.href =
                        "/result.html";

                } catch (error) {

                    console.error(
                        "Prediction error:",
                        error
                    );

                    showMessage(
                        message,
                        error.message
                    );

                } finally {

                    setLoading(
                        button,
                        false,
                        "Predict Result"
                    );
                }
            }
        );
    }
}
