// ── Vercel Serverless Function: Local PC to Cloud Sync Bridge ──
let memorySyncedSessions = [];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET: Fetch synced sessions
  if (req.method === "GET") {
    return res.status(200).json({ sessions: memorySyncedSessions });
  }

  // POST: Receive session bundle from PC
  if (req.method === "POST") {
    const { sessions, secret } = req.body || {};
    if (Array.isArray(sessions)) {
      memorySyncedSessions = sessions;
      return res.status(200).json({
        success: true,
        syncedCount: sessions.length,
        timestamp: new Date().toISOString()
      });
    }
    return res.status(400).json({ error: "Invalid sessions payload" });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
};
