import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_me";

app.use(cors());
app.use(express.json());

// ============================================================
//  IN-MEMORY USER STORE
//  ⚠️ Users are lost when server restarts.
//  For persistence, use a real DB (MongoDB, SQLite, etc.)
// ============================================================
const users = []; // [{ id, username, passwordHash }]

// ============================================================
//  HEALTH CHECK
// ============================================================
app.get("/", (req, res) => {
  res.json({
    status: "AI Event Planner Backend is running ✅ (Groq + JWT)",
    users: users.length
  });
});

// ============================================================
//  SIGNUP
// ============================================================
app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username: username.trim(),
      passwordHash
    };
    users.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Signup successful",
      token,
      username: newUser.username
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ============================================================
//  LOGIN
// ============================================================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!foundUser) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(password, foundUser.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: foundUser.id, username: foundUser.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      username: foundUser.username
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ============================================================
//  AUTH MIDDLEWARE
// ============================================================
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided. Please log in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}

// ============================================================
//  PROTECTED: GENERATE PLAN
// ============================================================
app.post("/api/plan", verifyToken, async (req, res) => {
  const { eventType, guests, budget, theme } = req.body;

  if (!eventType || !guests || !budget) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log(`📝 Plan requested by ${req.user.username}: ${eventType} for ${guests} guests`);

  const prompt = `
You are a professional event planner. Create a detailed event plan.

Event Type: ${eventType}
Number of Guests: ${guests}
Budget: ₹${budget}
Theme/Vibe: ${theme || "Elegant"}

Give the response in this EXACT format (use markdown headings):

## 🎯 Event Overview
(2-3 lines summary)

## 🕐 Timeline
- (5-6 timeline items with times)

## 🎨 Decoration Ideas
- (5-6 bullet points)

## 🍽️ Food & Menu Suggestions
- (5-6 bullet points)

## 💰 Budget Breakdown
- (categories with ₹ amounts that add up to ₹${budget})

## 💡 Pro Tips
- (3-4 tips)
  `;

  try {
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: "You are a professional event planner who gives detailed, practical, and creative event plans."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API error");

    const text = data.choices[0].message.content;
    res.json({ plan: text });
  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});