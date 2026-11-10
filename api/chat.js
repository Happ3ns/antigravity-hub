// ── Vercel Serverless Function & Local Node Proxy: Pre-installed Gemini Streaming Agent ──

const MODEL_MIGRATION_MAP = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.0-flash": "gemini-3.8-flash",
  "gemini-2.0-flash-thinking-exp": "gemini-3.8-flash",
  "gemini-1.5-flash": "gemini-3.8-flash",
  "gemini-1.5-pro": "gemini-4-argon",
  "gemini-2.5-pro": "gemini-4-argon",
};

function resolveActiveModel(requested) {
  const m = (requested || "gemini-3.8-flash").trim();
  if (MODEL_MIGRATION_MAP[m]) return MODEL_MIGRATION_MAP[m];
  if (m.startsWith("gemini-1.5") || m.startsWith("gemini-2.")) return "gemini-3.8-flash";
  return m;
}

function buildSanitizedContents(history, prompt) {
  const contents = [];
  for (const msg of history || []) {
    if (!msg || typeof msg.content !== "string" || !msg.content.trim()) continue;
    const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n\n" + msg.content;
    } else {
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  }

  while (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  if (typeof prompt === "string" && prompt.trim()) {
    const last = contents[contents.length - 1];
    if (!last || last.role !== "user" || last.parts[0].text !== prompt.trim()) {
      if (last && last.role === "user") {
        last.parts[0].text += "\n\n" + prompt.trim();
      } else {
        contents.push({ role: "user", parts: [{ text: prompt.trim() }] });
      }
    }
  }
  return contents;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method === "GET") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(
      JSON.stringify({
        ok: true,
        preinstalledKey: Boolean(process.env.GEMINI_API_KEY),
        defaultModel: "gemini-3.8-flash",
      })
    );
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  const { prompt, model, apiKey, history, systemInstruction, stream } = req.body || {};
  const activeKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();

  if (!activeKey) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error:
          "No GEMINI_API_KEY is configured on this server. Add GEMINI_API_KEY in Vercel Environment Variables (or paste a key in Settings).",
      })
    );
  }

  const targetModel = resolveActiveModel(model);
  const sysText =
    systemInstruction ||
    `You are Antigravity, Google DeepMind's Advanced Agentic Coding Assistant running in the cloud for Akshat.
Be direct, conversational, helpful, and crisp. Format responses with GitHub markdown, KaTeX math notation ($$...$$ or $...$), and code blocks.
Wrap brief internal reasoning in <thinking>...</thinking> tags before the final answer.`;

  const contents = buildSanitizedContents(history, prompt);
  if (contents.length === 0) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Prompt cannot be empty." }));
  }

  const payload = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: sysText }] },
  });

  const shouldStream = stream !== false;
  const endpoint = shouldStream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(activeKey)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(activeKey)}`;

  try {
    const apiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (!apiRes.ok) {
      let errMessage = `Gemini API HTTP ${apiRes.status}`;
      try {
        const errJson = await apiRes.json();
        errMessage = errJson?.error?.message || errMessage;
      } catch (e) {
        errMessage = await apiRes.text().catch(() => errMessage);
      }
      res.statusCode = apiRes.status;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: errMessage }));
    }

    if (shouldStream && apiRes.body) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });

      const reader = apiRes.body.getReader();
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          res.write(decoder.decode(value, { stream: true }));
        }
      }
      return res.end();
    }

    const data = await apiRes.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    let thinking = "";
    let cleanContent = "";
    for (const part of parts) {
      if (!part.text) continue;
      if (part.thought) thinking += part.text;
      else cleanContent += part.text;
    }

    const thinkMatch = cleanContent.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkMatch) {
      thinking = thinking || thinkMatch[1].trim();
      cleanContent = cleanContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ content: cleanContent, thinking }));
  } catch (error) {
    console.error("Proxy Gemini error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: error.message }));
    }
    return res.end();
  }
};
