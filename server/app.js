const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../client")));

// Routes
const propertyRoutes = require("./routes/properties");
const authRoutes = require("./routes/auth");

app.use("/api/properties", propertyRoutes);
app.use("/api/auth", authRoutes);

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏠 Real Estate Platform running at http://localhost:${PORT}`);
});
