const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2');
const cors = require("cors");

const app = express();
const port = 3000;

// ===========================
// MIDDLEWARE
// ===========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // <-- cukup ini saja

// ===========================
// DATABASE
// ===========================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: 3308,
    password: 'Deandwib12345*',
    database: 'apikeyyy'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to database.');
});

// ===========================
// HALAMAN
// ===========================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===========================
// API : BUAT API KEY
// ===========================
app.post('/create', (req, res) => {
    try {
        const token = crypto.randomBytes(32).toString("base64url");
        const stamp = Date.now();
        const apiKey = `sk-co-vi-${token}_${stamp}`;

        const date = new Date();
        date.setDate(date.getDate() + 30);

        const outOfDate = date.toISOString().slice(0, 19).replace("T", " ");

        const sql = "INSERT INTO api_key (KeyValue, out_of_date) VALUES (?, ?)";

        db.query(sql, [apiKey, outOfDate], err => {
            if (err) return res.status(500).json({ error: "Gagal menyimpan API Key" });
            res.json({ apiKey, expired: outOfDate });
        });

    } catch (e) {
        res.status(500).json({ error: "Gagal membuat API Key" });
    }
});

// ===========================
// CEK API KEY
// ===========================
app.post('/check', (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey) return res.status(400).json({ error: "API key wajib diisi" });

    const sql = "SELECT * FROM api_key WHERE KeyValue = ?";
    db.query(sql, [apiKey], (err, results) => {

        if (err) return res.status(500).json({ error: "Gagal cek API key" });

        if (results.length === 0) {
            return res.json({ valid: false, message: "API key tidak ditemukan" });
        }

        const expiry = new Date(results[0].out_of_date);
        const now = new Date();

        if (now > expiry) {
            return res.json({ valid: false, message: "API key expired" });
        }

        res.json({ valid: true, message: "API key valid" });
    });
});

// ===========================
// REGISTER USER → REDIRECT + NOTIF
// ===========================
app.post('/register/user', (req, res) => {
    const { first_name, last_name, email } = req.body;

    if (!first_name || !email) {
        return res.status(400).json({ error: "Nama depan dan email wajib diisi" });
    }

    const sql = "INSERT INTO user (first_name, last_name, email) VALUES (?, ?, ?)";

    db.query(sql, [first_name, last_name, email], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ error: "Email sudah terdaftar!" });
            }
            return res.status(500).json({ error: "Gagal daftar user" });
        }

        res.redirect('/dashboard-user?notif=success');
    });
});

// ===========================
// GET DATA
// ===========================
app.get("/get/users", (req, res) => {
    const sql = "SELECT * FROM user";

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Gagal mengambil data user" });
        res.json(results);
    });
});

app.get("/get/apikeys", (req, res) => {
    const sql = "SELECT * FROM api_key";

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Gagal mengambil data API key" });
        res.json(results);
    });
});

// ===========================
// ROUTE DASHBOARD USER
// ===========================
app.get("/dashboard-user", (req, res) => {
    const filePath = path.join(__dirname, "public", "dashboard-user.html");
    res.sendFile(filePath, err => {
        if (err) {
            console.error("Gagal membuka file:", err);
            res.status(404).send("File dashboard-user.html tidak ditemukan!");
        }
    });
});

// ===========================
// SERVER
// ===========================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
