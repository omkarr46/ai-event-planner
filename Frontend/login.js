// ============================================================
//  CONFIG
// ============================================================
const BACKEND_URL = "http://localhost:5000";

// ============================================================
//  ELEMENTS
// ============================================================
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const messageEl = document.getElementById("message");

// ============================================================
//  IF ALREADY LOGGED IN → GO TO PLANNER
// ============================================================
if (localStorage.getItem("eventPlannerToken")) {
  window.location.href = "index.html";
}

// ============================================================
//  TAB SWITCHING
// ============================================================
tabLogin.addEventListener("click", () => switchTab("login"));
tabSignup.addEventListener("click", () => switchTab("signup"));

function switchTab(which) {
  messageEl.textContent = "";
  messageEl.classList.remove("success");

  if (which === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }
}

// ============================================================
//  LOGIN
// ============================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  showMessage("");
  setLoading(btn, true, "Signing in...");

  try {
    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("eventPlannerToken", data.token);
    localStorage.setItem("eventPlannerUser", data.username);
    localStorage.setItem("eventPlannerLoginTime", Date.now());

    showMessage("✅ Login successful! Redirecting...", true);
    setTimeout(() => (window.location.href = "index.html"), 600);
  } catch (err) {
    showMessage("❌ " + err.message);
    setLoading(btn, false, "Sign In");
  }
});

// ============================================================
//  SIGNUP
// ============================================================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("signupBtn");
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;

  showMessage("");

  if (password !== confirm) {
    showMessage("❌ Passwords do not match");
    return;
  }

  setLoading(btn, true, "Creating...");

  try {
    const res = await fetch(`${BACKEND_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Signup failed");

    localStorage.setItem("eventPlannerToken", data.token);
    localStorage.setItem("eventPlannerUser", data.username);
    localStorage.setItem("eventPlannerLoginTime", Date.now());

    showMessage("✅ Account created! Redirecting...", true);
    setTimeout(() => (window.location.href = "index.html"), 600);
  } catch (err) {
    showMessage("❌ " + err.message);
    setLoading(btn, false, "Create Account");
  }
});

// ============================================================
//  PASSWORD VISIBILITY TOGGLE (SVG eye icons)
// ============================================================
document.querySelectorAll(".toggle-pass").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.classList.toggle("showing", isHidden);
  });
});

// ============================================================
//  HELPERS
// ============================================================
function showMessage(text, success = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("success", success);
}

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.classList.toggle("loading", loading);
  btn.querySelector(".btn-text").textContent = label;
}