const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "realestate_dev_secret_2025";

// In-memory users (replace with DB later)
let users = [
  {
    id: 1,
    name: "Admin",
    email: "admin@platform.pt",
    // password: admin123
    password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    role: "admin",
    agency: "Imobiliária Central"
  }
];

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, agency } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now(),
    name,
    email,
    password: hashed,
    role: "agent",
    agency: agency || "Independent"
  };
  users.push(user);

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, agency: user.agency } });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, agency: user.agency } });
});

// GET /api/auth/me (protected)
router.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(auth.replace("Bearer ", ""), SECRET);
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, agency: user.agency });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
