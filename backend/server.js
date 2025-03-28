const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app); // Needed for Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", // Local development (frontend)
      "http://localhost:5173", // Another local dev server
      "https://user-managmen.netlify.app", // Production URL on Netlify
    ],
    credentials: true, // Allow credentials such as cookies to be sent
  },
});

app.use(
  cors({
    origin: [
      "http://localhost:3000", // Local development (frontend)
      "http://localhost:5173", // Another local dev server
      "https://user-managmen.netlify.app", // Production URL on Netlify
    ],
    credentials: true, // Allow credentials such as cookies to be sent
  })
);

// ✅ Handle Preflight OPTIONS Requests
app.options("*", cors()); // This will handle preflight OPTIONS requests
app.use(express.json());

// Use DATABASE_URL from .env or fallback to the original connection parameters
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // For using SSL with Render or other cloud-hosted databases
  },
});

// ✅ Middleware for JWT Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET || "your_secret_key", (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token." });
    req.user = user;  // Add user info to request object
    next();
  });
};

// ✅ Middleware to check if a user is blocked
const checkIfBlocked = async (req, res, next) => {
  try {
    const userResult = await pool.query("SELECT status FROM users WHERE id = $1", [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    if (userResult.rows[0].status === "blocked") {
      return res.status(403).json({ error: "You are blocked. Action not allowed." });
    }

    next();
  } catch (error) {
    console.error("Error checking block status:", error);
    res.status(500).json({ error: "Server error." });
  }
};

// Add routes for register, login, block/unblock, etc. (the same as before)

const PORT = process.env.PORT || 5000;
console.log("Server running on port", process.env.PORT);
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
