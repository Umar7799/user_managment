const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const http = require("http"); // 🔥 Added
const { Server } = require("socket.io"); // 🔥 Added

dotenv.config();

const app = express();
const server = http.createServer(app); // 🔥 Wrap Express with HTTP server
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], // Allow both ports
    credentials: true,
  },
});

app.use(express.json());
app.use(cors());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "user_management",
  password: process.env.DB_PASSWORD || "your_password",
  port: process.env.DB_PORT || 5432,
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("⚡ A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);
  });
});

// Broadcast user updates
const broadcastUsers = async () => {
  try {
    const users = await pool.query("SELECT id, name, email, last_login, status FROM users ORDER BY last_login DESC");
    io.emit("usersUpdated", users.rows); // 🔥 Send update to all clients
  } catch (error) {
    console.error("Error broadcasting users:", error);
  }
};

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: "Invalid email or password." });

    const user = userResult.rows[0];
    if (user.status === "blocked") return res.status(403).json({ error: "User is blocked." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "your_secret_key", {
      expiresIn: "1h",
    });

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
    res.json({ message: "Login successful!", token });

    broadcastUsers(); // 🔥 Notify all clients about the login update
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed." });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await pool.query("SELECT id, name, email, last_login, status FROM users ORDER BY last_login DESC");
    res.json({ users: users.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Could not fetch users." });
  }
});

// Block a user
app.put("/api/users/block/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("UPDATE users SET status = 'blocked' WHERE id = $1 RETURNING id, name, status", [
      id,
    ]);

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({ message: `User ${result.rows[0].name} has been blocked.`, user: result.rows[0] });

    broadcastUsers(); // 🔥 Notify all clients
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Could not block user." });
  }
});

// Unblock a user
app.put("/api/users/unblock/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("UPDATE users SET status = 'active' WHERE id = $1 RETURNING id, name, status", [
      id,
    ]);

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({ message: `User ${result.rows[0].name} has been unblocked.`, user: result.rows[0] });

    broadcastUsers(); // 🔥 Notify all clients
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "Could not unblock user." });
  }
});

// Delete a user
app.delete("/api/users/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id, name", [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({ message: `User ${result.rows[0].name} has been deleted.`, user: result.rows[0] });

    broadcastUsers(); // 🔥 Notify all clients
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Could not delete user." });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
