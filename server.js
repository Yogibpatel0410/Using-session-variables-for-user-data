
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");

const app = express();

// Connect to MySQL database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.ROOTPASS,
    database: "usersdb"
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Configure user sessions
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        httpOnly: true
    }
}));

// Register a new user
app.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

    db.query(sql, [username, email, password], (err) => {
        if (err) {
            return res.send("Registration failed.");
        }

        res.send(`
            <h2>You have successfully registered!</h2>
            <a href="/login.html">Login Here</a>
        `);
    });
});

// Login user
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            return res.send("Database error.");
        }

        if (results.length === 0) {
            return res.send(`
                <h2>Login credentials were incorrect.</h2>
                <a href="/login.html">Try Again</a>
            `);
        }

        // Create a new session after successful login
        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).send("Session error.");
            }

            // Store username in session
            req.session.username = username;

            req.session.save((err) => {
                if (err) {
                    return res.status(500).send("Session error.");
                }

                res.send(`
                    <h2>You have logged in successfully!</h2>
                    <a href="/profile">View Profile</a>
                `);
            });
        });
    });
});

// Display username from session
app.get("/profile", (req, res) => {
    if (!req.session.username) {
        return res.send(`
            <h2>You are not logged in.</h2>
            <a href="/login.html">Login Here</a>
        `);
    }

    const username = escapeHtml(req.session.username);

    res.send(`
        <h2>My Profile</h2>
        <p>Welcome, ${username}!</p>
        <a href="/logout">Logout</a>
    `);
});

// Destroy session when user logs out
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out.");
        }

        res.clearCookie("connect.sid");

        res.send(`
            <h2>Logged out successfully!</h2>
            <a href="/login.html">Login Again</a>
        `);
    });
});

// Prevent HTML injection when displaying usernames
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
