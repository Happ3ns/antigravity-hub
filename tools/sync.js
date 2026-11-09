// ── Local PC to Cloud Sync Utility (Node.js with Secret Sanitization) ──
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\91902', '.gemini', 'antigravity', 'brain');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'synced-sessions.json');

function redactSecrets(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/(ghp_[A-Za-z0-9_]{15,}|github_pat_[A-Za-z0-9_]{15,})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(AIzaSy[A-Za-z0-9_-]{25,})/g, '[REDACTED_GEMINI_KEY]');
}

function runSync() {
  console.log(`[Antigravity Sync] Scanning brain directory: ${BRAIN_DIR}`);

  if (!fs.existsSync(BRAIN_DIR)) {
    console.error(`[Error] Brain directory not found: ${BRAIN_DIR}`);
    return;
  }

  const entries = fs.readdirSync(BRAIN_DIR, { withFileTypes: true });
  const sessions = [];

  entries.forEach(entry => {
    if (!entry.isDirectory()) return;
    const convId = entry.name;
    const convDir = path.join(BRAIN_DIR, convId);
    const transcriptPath = path.join(convDir, '.system_generated', 'logs', 'transcript.jsonl');

    if (!fs.existsSync(transcriptPath)) return;

    try {
      const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
      const messages = [];
      let firstUserPrompt = "Antigravity Session";

      lines.forEach(line => {
        try {
          const step = JSON.parse(line);
          if (step.type === "USER_INPUT") {
            let txt = typeof step.content === "string" ? step.content : (step.content?.text || "");
            txt = redactSecrets(txt);
            if (txt && firstUserPrompt === "Antigravity Session") {
              firstUserPrompt = txt.slice(0, 36) + (txt.length > 36 ? "..." : "");
            }
            messages.push({
              role: "user",
              content: txt,
              created_at: step.created_at || new Date().toISOString()
            });
          } else if (step.type === "PLANNER_RESPONSE") {
            let rawContent = typeof step.content === "string" ? step.content : "";
            rawContent = redactSecrets(rawContent);
            let thinking = redactSecrets(step.thinking || "");

            messages.push({
              role: "assistant",
              content: rawContent,
              thinking: thinking,
              tool_calls: step.tool_calls || [],
              created_at: step.created_at || new Date().toISOString()
            });
          }
        } catch (e) {}
      });

      // Find artifacts in the conversation directory
      const convFiles = fs.readdirSync(convDir);
      const artifacts = [];
      convFiles.forEach(cf => {
        if (cf.endsWith('.md')) {
          let artContent = fs.readFileSync(path.join(convDir, cf), 'utf8');
          artContent = redactSecrets(artContent);
          artifacts.push({
            name: cf,
            content: artContent
          });
        }
      });

      sessions.push({
        id: convId,
        title: firstUserPrompt,
        created_at: new Date().toISOString(),
        messages: messages,
        artifacts: artifacts
      });

      console.log(`[Antigravity Sync] Processed conversation: ${convId} (${messages.length} messages, ${artifacts.length} artifacts)`);

    } catch (err) {
      console.warn(`[Warning] Failed to parse ${convId}:`, err.message);
    }
  });

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonStr = redactSecrets(JSON.stringify(sessions, null, 2));
  fs.writeFileSync(OUTPUT_FILE, jsonStr, 'utf8');
  console.log(`\n[Antigravity Sync] Successfully bundled ${sessions.length} sessions (all secrets redacted) to:`);
  console.log(`  -> ${OUTPUT_FILE}`);
}

runSync();
