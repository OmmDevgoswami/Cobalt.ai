// server.js - Slack Messaging with SQLite DB
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const https = require("https");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ====== DATABASE SETUP ======
const db = new sqlite3.Database(path.join(__dirname, "data.db"));

// Create tables if not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY,
      bot_token TEXT,
      scope TEXT,
      team TEXT,
      app_id TEXT,
      obtained_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scheduled (
      id TEXT PRIMARY KEY,
      channel TEXT,
      text TEXT,
      post_at INTEGER
    )
  `);
});

// Helper: Store token
function storeToken(tokenData) {
  db.run("DELETE FROM tokens");
  db.run(
    `INSERT INTO tokens (bot_token, scope, team, app_id, obtained_at) VALUES (?, ?, ?, ?, ?)`,
    [
      tokenData.bot_token,
      tokenData.scope,
      tokenData.team?.name || null,
      tokenData.app_id,
      Date.now(),
    ]
  );
}

// Helper: Get token
function getToken(callback) {
  db.get("SELECT bot_token FROM tokens LIMIT 1", (err, row) => {
    if (err) return callback(null);
    callback(row?.bot_token || null);
  });
}

const CLIENT_ID = process.env.SLACK_CLIENT_ID;
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI ||
  "https://localhost:3000/auth/slack/callback";
const PORT = process.env.PORT || 3000;

// 1) Redirect to Slack for OAuth
app.get("/auth/slack", (req, res) => {
  const scopes = ["chat:write", "channels:read", "channels:join", "users:read"];
  const url = `https://slack.com/oauth/v2/authorize?client_id=${CLIENT_ID}&scope=${scopes.join(
    ","
  )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

// 2) OAuth callback
app.get("/auth/slack/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided");

  try {
    const resp = await axios.post("https://slack.com/api/oauth.v2.access", null, {
      params: {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      },
    });

    if (!resp.data.ok) return res.status(500).send(resp.data.error);

    const tokenData = {
      bot_token: resp.data.access_token,
      scope: resp.data.scope,
      team: resp.data.team,
      app_id: resp.data.app_id,
    };

    storeToken(tokenData);
    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

async function postMessage(channel, text) {
  return new Promise((resolve, reject) => {
    getToken(async (token) => {
      if (!token) return reject(new Error("No token stored. Connect Slack first."));

      try {
        await axios.post(
          "https://slack.com/api/conversations.join",
          { channel },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
      } catch (_) {}

      const resp = await axios.post(
        "https://slack.com/api/chat.postMessage",
        { channel, text },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      resolve(resp.data);
    });
  });
}
// ====== API ROUTES ======

// Send now
app.post("/api/send", async (req, res) => {
  const { channel, text } = req.body;
  try {
    const r = await postMessage(channel, text);
    if (!r.ok) return res.status(500).json(r);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get channels
app.get("/api/channels", (req, res) => {
  getToken(async (token) => {
    if (!token) return res.status(400).json({ error: "Connect Slack first" });

    try {
      const r = await axios.get("https://slack.com/api/conversations.list", {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 200 },
      });
      res.json({ ok: true, channels: r.data.channels });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});
// Schedule message
app.post("/api/schedule", (req, res) => {
  const { channel, text, sendAt } = req.body;
  getToken(async (token) => {
    if (!token) return res.status(400).json({ error: "Connect Slack first" });

    try {
      const postAtUnix = Math.floor(new Date(sendAt).getTime() / 1000);
      const slackResp = await axios.post(
        "https://slack.com/api/chat.scheduleMessage",
        { channel, text, post_at: postAtUnix },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      if (!slackResp.data.ok) return res.status(500).json(slackResp.data);

      db.run(
        `INSERT INTO scheduled (id, channel, text, post_at) VALUES (?, ?, ?, ?)`,
        [slackResp.data.scheduled_message_id, channel, text, postAtUnix]
      );

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});
// List scheduled messages
app.get("/api/scheduled", (req, res) => {
  db.all(`SELECT * FROM scheduled`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, messages: rows });
  });
});
// Cancel scheduled message
app.delete("/api/scheduled/:id", (req, res) => {
  const id = req.params.id;
  getToken(async (token) => {
    if (!token) return res.status(400).json({ error: "Connect Slack first" });

    try {
      await axios.post(
        "https://slack.com/api/chat.deleteScheduledMessage",
        { channel: req.body.channel, scheduled_message_id: id },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      db.run(`DELETE FROM scheduled WHERE id = ?`, [id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

const sslOptions = {
  key: fs.readFileSync("./cert/key.pem"),
  cert: fs.readFileSync("./cert/cert.pem"),
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🚀 HTTPS Server running on https://localhost:${PORT}`);
});
