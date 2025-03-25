const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Fixed CORS issue (Allow multiple origins)
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5173"], // Allow both ports
  credentials: true,
};
app.use(cors(corsOptions));

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "user_management",
  password: process.env.DB_PASSWORD || "your_password",
  port: process.env.DB_PORT || 5432,
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
    req.user = user;
    next();
  });
};

// ✅ Register a New User
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user (status defaults to 'active')
    await pool.query(
      "INSERT INTO users (name, email, password, status, last_login) VALUES ($1, $2, $3, 'active', NOW())",
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email error (unique index constraint)
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists." });
    }

    res.status(500).json({ error: "Could not register user." });
  }
});

// ✅ User Login
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

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "1h" }
    );

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
    res.json({ message: "Login successful!", token });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed." });
  }
});

// ✅ Get All Users
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const users = await pool.query("SELECT id, name, email, last_login, status FROM users ORDER BY last_login DESC");
    res.json({ users: users.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Could not fetch users." });
  }
});

// ✅ Block a User (Everyone can do this)
app.put("/api/users/block/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("UPDATE users SET status = 'blocked' WHERE id = $1 RETURNING id, name, status", [
      id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({ message: `User ${result.rows[0].name} has been blocked.`, user: result.rows[0] });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Could not block user." });
  }
});

// ✅ Unblock a User (Everyone can do this)
app.put("/api/users/unblock/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("UPDATE users SET status = 'active' WHERE id = $1 RETURNING id, name, status", [
      id,
    ]);

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({ message: `User ${result.rows[0].name} has been unblocked.`, user: result.rows[0] });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "Could not unblock user." });
  }
});

// ✅ Delete a User (Everyone can do this)
app.delete("/api/users/delete/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id, name", [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({ message: `User ${result.rows[0].name} has been deleted.`, user: result.rows[0] });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Could not delete user." });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
