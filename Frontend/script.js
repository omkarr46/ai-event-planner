// ============================================================
//  AUTH GUARD — check token
// ============================================================
const token = localStorage.getItem("eventPlannerToken");
const user = localStorage.getItem("eventPlannerUser");

if (!token || !user) {
  window.location.href = "login.html";
}

// ============================================================
//  MODE SWITCH
// ============================================================
const MODE = "backend"; // "mock" or "backend"
const BACKEND_URL = "http://localhost:5000";

const generateBtn = document.getElementById("generateBtn");
const resultDiv = document.getElementById("result");
const resultContent = document.getElementById("resultContent");
const savePlanBtn = document.getElementById("savePlanBtn");

let currentPlan = null;

generateBtn.addEventListener("click", generatePlan);

// ============================================================
//  GENERATE PLAN
// ============================================================
async function generatePlan() {
  const eventType = document.getElementById("eventType").value;
  const eventDate = document.getElementById("eventDate").value;
  const guests = document.getElementById("guests").value;
  const budget = document.getElementById("budget").value;
  const theme = document.getElementById("theme").value;

  if (!guests || !budget) {
    alert("Please fill in guests and budget!");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.classList.add("loading");
  const btnText = generateBtn.querySelector(".btn-text");
  btnText.textContent = "Planning...";
  resultDiv.classList.add("hidden");

  const loadingMessages = [
    "🧠 AI is thinking...",
    "🎨 Designing your event...",
    "💰 Calculating budget...",
    "🍽️ Curating menu ideas...",
    "✨ Almost there..."
  ];
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    btnText.textContent = loadingMessages[msgIndex];
  }, 1200);

  try {
    let planText;

    if (MODE === "mock") {
      await new Promise(r => setTimeout(r, 1200));
      planText = generateMockPlan(eventType, guests, budget, theme);
    } else {
      const response = await fetch(`${BACKEND_URL}/api/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ eventType, guests, budget, theme })
      });
      const data = await response.json();

      if (response.status === 401) {
        // Token invalid or expired — force re-login
        alert("Session expired. Please log in again.");
        localStorage.removeItem("eventPlannerToken");
        localStorage.removeItem("eventPlannerUser");
        window.location.href = "login.html";
        return;
      }

      if (!response.ok) throw new Error(data.error || "Something went wrong");
      planText = data.plan;
    }

    currentPlan = {
      eventType,
      eventDate,
      guests,
      budget,
      theme,
      plan: planText,
      generatedAt: new Date().toISOString()
    };

    resultContent.innerHTML = formatResponse(planText);
    resultDiv.classList.remove("hidden");
    savePlanBtn.disabled = false;
    savePlanBtn.textContent = "💾 Save This Event";
    resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    let friendlyMsg = err.message;
    if (err.message.includes("Failed to fetch")) {
      friendlyMsg = "Cannot reach backend. Make sure it's running on http://localhost:5000 (npm start in the Backend folder).";
    } else if (err.message.includes("429")) {
      friendlyMsg = "Too many requests. Please wait a minute and try again.";
    } else if (err.message.includes("401") || err.message.includes("token")) {
      friendlyMsg = "Session issue. Please log in again.";
    }
    resultContent.innerHTML = `<p style="color:#ff6b6b;">❌ ${friendlyMsg}</p>`;
    resultDiv.classList.remove("hidden");
  } finally {
    clearInterval(msgInterval);
    generateBtn.disabled = false;
    generateBtn.classList.remove("loading");
    btnText.textContent = "Generate Event Plan";
  }
}

// ============================================================
//  SAVE PLAN
// ============================================================
savePlanBtn.addEventListener("click", () => {
  if (!currentPlan) return;

  const saved = getSavedEvents();
  const newEvent = { id: Date.now(), ...currentPlan };
  saved.unshift(newEvent);
  localStorage.setItem("eventPlannerSaved", JSON.stringify(saved));

  savePlanBtn.disabled = true;
  savePlanBtn.textContent = "✅ Saved!";
  showToast("✅ Event saved successfully!");

  setTimeout(() => {
    savePlanBtn.textContent = "💾 Save This Event";
    savePlanBtn.disabled = false;
  }, 2000);
});

// ============================================================
//  VIEW PAST EVENTS
// ============================================================
const viewPastBtn = document.getElementById("viewPastBtn");
const closePastBtn = document.getElementById("closePastBtn");
const pastEvents = document.getElementById("pastEvents");
const pastList = document.getElementById("pastList");

viewPastBtn.addEventListener("click", () => {
  renderPastEvents();
  pastEvents.classList.remove("hidden");
  pastEvents.scrollIntoView({ behavior: "smooth", block: "start" });
});

closePastBtn.addEventListener("click", () => {
  pastEvents.classList.add("hidden");
});

function renderPastEvents() {
  const events = getSavedEvents();

  if (events.length === 0) {
    pastList.innerHTML = `<div class="no-events">📭 No saved events yet. Generate a plan and click "Save This Event".</div>`;
    return;
  }

  pastList.innerHTML = events.map(ev => {
    const dateStr = ev.eventDate
      ? new Date(ev.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "No date set";
    const savedAt = new Date(ev.generatedAt).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    return `
      <div class="past-item">
        <div class="past-item-info">
          <h3>🎊 ${ev.eventType} <span style="color:#00d4ff;">· ${ev.theme}</span></h3>
          <p>📅 ${dateStr} &nbsp;|&nbsp; 👥 ${ev.guests} guests &nbsp;|&nbsp; 💰 ₹${ev.budget}</p>
          <p style="font-size:0.75rem; color:#8888bb; margin-top:4px;">Saved: ${savedAt}</p>
        </div>
        <div class="past-item-actions">
          <button class="view-btn" onclick="viewPastEvent(${ev.id})">👁️ View</button>
          <button class="delete-btn" onclick="deletePastEvent(${ev.id})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

window.viewPastEvent = function (id) {
  const events = getSavedEvents();
  const ev = events.find(e => e.id === id);
  if (!ev) return;

  document.getElementById("eventType").value = ev.eventType;
  document.getElementById("eventDate").value = ev.eventDate || "";
  document.getElementById("guests").value = ev.guests;
  document.getElementById("budget").value = ev.budget;
  document.getElementById("theme").value = ev.theme;

  currentPlan = ev;
  resultContent.innerHTML = formatResponse(ev.plan);
  resultDiv.classList.remove("hidden");
  savePlanBtn.disabled = false;
  savePlanBtn.textContent = "💾 Save This Event";

  pastEvents.classList.add("hidden");
  resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.deletePastEvent = function (id) {
  if (!confirm("Delete this saved event?")) return;
  const events = getSavedEvents().filter(e => e.id !== id);
  localStorage.setItem("eventPlannerSaved", JSON.stringify(events));
  renderPastEvents();
  showToast("🗑️ Event deleted");
};

// ============================================================
//  HELPERS
// ============================================================
function getSavedEvents() {
  try {
    return JSON.parse(localStorage.getItem("eventPlannerSaved") || "[]");
  } catch {
    return [];
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// ============================================================
//  CLEAR FORM
// ============================================================
const clearBtn = document.getElementById("clearBtn");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    document.getElementById("eventDate").value = "";
    document.getElementById("guests").value = "";
    document.getElementById("budget").value = "";
    document.getElementById("eventType").selectedIndex = 0;
    document.getElementById("theme").selectedIndex = 0;
    resultDiv.classList.add("hidden");
    resultContent.innerHTML = "";
    currentPlan = null;
  });
}

// ============================================================
//  USERNAME + LOGOUT
// ============================================================
const userNameEl = document.getElementById("userName");
if (userNameEl && user) {
  userNameEl.textContent = user;
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("eventPlannerToken");
      localStorage.removeItem("eventPlannerUser");
      localStorage.removeItem("eventPlannerLoginTime");
      window.location.href = "login.html";
    }
  });
}

// ============================================================
//  MOCK PLAN (fallback)
// ============================================================
function generateMockPlan(eventType, guests, budget, theme) {
  const b = Number(budget);
  const venue = Math.round(b * 0.30);
  const food = Math.round(b * 0.35);
  const decor = Math.round(b * 0.15);
  const entertainment = Math.round(b * 0.12);
  const misc = b - venue - food - decor - entertainment;

  return `## 🎯 Event Overview
A ${theme || "elegant"} ${eventType} for ${guests} guests with a total budget of ₹${budget}.

## 🕐 Timeline
- 09:00 AM — Venue setup begins
- 11:00 AM — Vendor coordination
- 04:00 PM — Guests arrive
- 05:00 PM — Main program
- 07:00 PM — Dinner
- 09:00 PM — Entertainment

## 🎨 Decoration Ideas
- Themed entrance arch
- Centerpiece tables
- Photo booth
- String lights

## 🍽️ Food & Menu Suggestions
- Welcome drinks
- Starters
- Main course
- Desserts

## 💰 Budget Breakdown (₹${budget})
- Venue: ₹${venue}
- Food: ₹${food}
- Decoration: ₹${decor}
- Entertainment: ₹${entertainment}
- Misc: ₹${misc}

## 💡 Pro Tips
- Book venue early
- Keep 10% buffer
- Hire a coordinator`;
}

// ============================================================
//  MARKDOWN FORMATTER
// ============================================================
function formatResponse(text) {
  return text
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\s*[-*] (.*$)/gim, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/>")
    .replace(/\n/g, "<br/>");
}