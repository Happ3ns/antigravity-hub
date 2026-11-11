// ── Vercel Serverless Function: Cross-Device Session Sync (In-Memory + Optional GitHub Gist) ──
const crypto = require("node:crypto");
let memorySyncedSessions = [];

function checkSyncAuth(req) {
  const required = (process.env.STUDIO_PASSCODE || "").trim();
  if (!required) return true;
  const supplied = String(
    req.headers?.["x-studio-passcode"] || req.body?.passcode || req.body?.secret || ""
  ).trim();
  if (!supplied) return false;
  const a = crypto.createHash("sha256").update(required).digest();
  const b = crypto.createHash("sha256").update(supplied).digest();
  return crypto.timingSafeEqual(a, b);
}

function mergeSessionLists(base = [], incoming = []) {
  const map = new Map();
  for (const s of [...base, ...incoming]) {
    if (!s || !s.id) continue;
    const prev = map.get(s.id);
    if (!prev || (s.messages?.length || 0) >= (prev.messages?.length || 0)) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values()).slice(0, 50);
}

async function fetchFromGist(gistId, token) {
  if (!gistId) return null;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Antigravity-Hub-Sync/1.0",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const raw = data?.files?.["antigravity-sessions.json"]?.content;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : null;
}

async function saveToGist(gistId, token, sessions) {
  if (!gistId || !token) return { savedToGist: false };
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Antigravity-Hub-Sync/1.0",
    },
    body: JSON.stringify({
      files: {
        "antigravity-sessions.json": {
          content: JSON.stringify(sessions, null, 2),
        },
      },
    }),
  });
  return { savedToGist: res.ok, gistStatus: res.status };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Studio-Passcode");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!checkSyncAuth(req)) {
    return res.status(401).json({ error: "Invalid studio passcode." });
  }

  const urlObj = new URL(req.url || "/api/sync", "http://localhost");
  const gistId = (req.body?.gistId || urlObj.searchParams.get("gistId") || process.env.SYNC_GIST_ID || "").trim();
  const ghToken = (req.body?.githubToken || process.env.GITHUB_TOKEN || "").trim();

  if (req.method === "GET") {
    let sessions = memorySyncedSessions;
    if (gistId) {
      try {
        const gistSessions = await fetchFromGist(gistId, ghToken);
        if (gistSessions) sessions = mergeSessionLists(memorySyncedSessions, gistSessions);
      } catch (e) {}
    }
    return res.status(200).json({ sessions, gistConnected: Boolean(gistId) });
  }

  if (req.method === "POST") {
    const { sessions } = req.body || {};
    if (!Array.isArray(sessions)) {
      return res.status(400).json({ error: "Invalid sessions payload" });
    }
    memorySyncedSessions = mergeSessionLists(memorySyncedSessions, sessions);
    let gistInfo = { savedToGist: false };
    if (gistId && ghToken) {
      try {
        gistInfo = await saveToGist(gistId, ghToken, memorySyncedSessions);
      } catch (e) {}
    }
    return res.status(200).json({
      success: true,
      syncedCount: memorySyncedSessions.length,
      ...gistInfo,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
};
