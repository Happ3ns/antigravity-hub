// ── Vercel Serverless Function & Local Node Proxy: Multi-Turn Streaming Antigravity Agent ──
const crypto = require("node:crypto");
const { getToolDeclarations, executeToolCall } = require("./_tools.js");

const MODEL_MIGRATION_MAP = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.0-flash": "gemini-3.8-flash",
  "gemini-2.0-flash-thinking-exp": "gemini-3.8-flash",
  "gemini-1.5-flash": "gemini-3.8-flash",
  "gemini-1.5-pro": "gemini-4-argon",
  "gemini-2.5-pro": "gemini-4-argon",
};

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
const RETRY_STATUSES = new Set([404, 429, 503]);
const ALLOWED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const overloadedModelUntil = new Map();

// Sliding-window per-IP rate limiter (25 requests / 60s per warm instance)
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 25;
const rateBuckets = new Map();

function getClientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  if (rateBuckets.size > 1000) {
    for (const [k, hits] of rateBuckets.entries()) {
      const fresh = hits.filter((t) => now - t < RATE_WINDOW_MS);
      if (fresh.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, fresh);
    }
  }
  const recent = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    rateBuckets.set(ip, recent);
    return { allowed: false, retryAfterSec };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { allowed: true, remaining: RATE_LIMIT_MAX - recent.length };
}

function verifyStudioPasscode(req) {
  const required = (process.env.STUDIO_PASSCODE || "").trim();
  if (!required) return true;
  const supplied = String(
    req.headers?.["x-studio-passcode"] || req.body?.passcode || ""
  ).trim();
  if (!supplied) return false;
  const a = crypto.createHash("sha256").update(required).digest();
  const b = crypto.createHash("sha256").update(supplied).digest();
  return crypto.timingSafeEqual(a, b);
}

function resolveActiveModel(requested) {
  const m = (requested || "gemini-3.8-flash").trim();
  if (MODEL_MIGRATION_MAP[m]) return MODEL_MIGRATION_MAP[m];
  if (m.startsWith("gemini-1.5") || m.startsWith("gemini-2.")) return "gemini-3.8-flash";
  return m;
}

function buildSanitizedContents(history, prompt, attachments = []) {
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

  const promptText = typeof prompt === "string" ? prompt.trim() : "";
  const extraParts = [];
  let textFileBundle = "";

  if (Array.isArray(attachments)) {
    for (const att of attachments.slice(0, 5)) {
      if (!att) continue;
      if (
        typeof att.data === "string" &&
        ALLOWED_IMAGE_MIMES.has(att.mimeType) &&
        att.data.length <= 4_500_000
      ) {
        extraParts.push({
          inlineData: { mimeType: att.mimeType, data: att.data },
        });
      } else if (typeof att.text === "string" && att.text.trim()) {
        const safeName = String(att.name || "attachment.txt").slice(0, 120);
        textFileBundle += `\n\n[Attached File: ${safeName}]\n\`\`\`\n${att.text.slice(0, 24000)}\n\`\`\``;
      }
    }
  }

  const combinedUserText = [promptText, textFileBundle.trim()].filter(Boolean).join("\n\n");
  if (combinedUserText || extraParts.length > 0) {
    const last = contents[contents.length - 1];
    const isDuplicateLastText =
      last && last.role === "user" && promptText && last.parts[0]?.text === promptText && extraParts.length === 0 && !textFileBundle;

    if (!isDuplicateLastText) {
      if (last && last.role === "user") {
        if (combinedUserText && last.parts[0]?.text !== promptText) {
          last.parts[0].text += "\n\n" + combinedUserText;
        } else if (textFileBundle) {
          last.parts[0].text += textFileBundle;
        }
        last.parts.push(...extraParts);
      } else {
        const parts = [];
        if (combinedUserText) parts.push({ text: combinedUserText });
        parts.push(...extraParts);
        contents.push({ role: "user", parts });
      }
    }
  }
  return contents;
}

function buildAgentSystemPrompt(customInstruction, { mode, webSearchEnabled, cotEnabled }) {
  const base =
    customInstruction ||
    `You are Antigravity, Google DeepMind's Advanced Agentic Coding Assistant running in the cloud for Akshat.
Be direct, conversational, helpful, and crisp. Format responses with GitHub markdown, KaTeX math notation ($$...$$ display, $...$ inline), and fenced code blocks.`;

  const capabilityNotes = [
    "",
    "=== LIVE RUNTIME TOOLS & GROUNDING RULES ===",
    `Web Search Toggle: ${webSearchEnabled ? "ENABLED (web_search & fetch_webpage available)" : "DISABLED by user"}`,
    `Chain-of-Thought Toggle: ${cotEnabled ? "ENABLED — wrap brief reasoning inside <thinking>...</thinking> before your final answer." : "DISABLED — omit <thinking> tags and answer directly."}`,
    `Mode: ${String(mode || "agentic").toUpperCase()}`,
    "Available server tools you can actually invoke:",
    "- github_list_repos, github_read_tree, github_read_file, github_search_code, github_commit_file (writes require user's GitHub PAT in Settings)",
    "- run_javascript (isolated JS sandbox for algorithms, math checks, and data transforms)",
    "- arxiv_search, pubchem_lookup (live scientific papers and chemical lookups)",
    "- create_artifact (opens interactive Markdown plans, reports, or standalone HTML widgets in the Studio pane)",
    "- save_memory_rule (saves permanent user preferences to AGENTS.md browser vault)",
    webSearchEnabled ? "- web_search, fetch_webpage (live internet search and webpage reading)" : "",
    "",
    "Strict Honesty Constraints:",
    "1. NEVER claim you ran a tool, searched the web, read a file, or edited a repo unless you actually called the tool in this turn and saw its result.",
    "2. If a task requires local PC terminal execution, local filesystem writes, or authenticated external SaaS MCPs (Figma, Notion, Supabase, Vercel deploy), tell the user honestly what this web runtime cannot execute directly and use GitHub/Artifact/JS tools where applicable.",
  ]
    .filter(Boolean)
    .join("\n");

  return base + "\n" + capabilityNotes;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Studio-Passcode");
}

function sendSse(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

function extractCompactPreview(output) {
  try {
    const raw = JSON.stringify(output);
    return raw.length > 550 ? raw.slice(0, 550) + "…" : raw;
  } catch (e) {
    return String(output).slice(0, 550);
  }
}

async function fetchGeminiWithFallback({ candidateModels, bodyObj, activeKey, shouldStream, externalSignal }) {
  const payload = JSON.stringify(bodyObj);
  const now = Date.now();
  const readyModels = candidateModels.filter((m) => (overloadedModelUntil.get(m) || 0) <= now);
  const orderedModels = readyModels.length > 0 ? readyModels : candidateModels;

  let lastRes = null;
  let usedModel = orderedModels[0];

  for (let i = 0; i < orderedModels.length; i++) {
    if (externalSignal?.aborted) {
      const abortErr = new Error("Request cancelled by client");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    usedModel = orderedModels[i];
    const hasMore = i < orderedModels.length - 1;
    const action = shouldStream ? "streamGenerateContent?alt=sse&" : "generateContent?";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(usedModel)}:${action}key=${encodeURIComponent(activeKey)}`;

    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener?.("abort", onExternalAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), hasMore ? 6500 : 24000);
    try {
      lastRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal,
      });
    } catch (err) {
      if (externalSignal?.aborted) throw err;
      overloadedModelUntil.set(usedModel, Date.now() + 90_000);
      if (!hasMore) throw err;
      continue;
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.("abort", onExternalAbort);
    }

    if (lastRes.ok) {
      overloadedModelUntil.delete(usedModel);
      return { apiRes: lastRes, activeModel: usedModel };
    }

    if (RETRY_STATUSES.has(lastRes.status)) {
      overloadedModelUntil.set(usedModel, Date.now() + (lastRes.status === 404 ? 600_000 : 90_000));
    }

    if (!RETRY_STATUSES.has(lastRes.status) || !hasMore) {
      return { apiRes: lastRes, activeModel: usedModel };
    }
    await lastRes.body?.cancel?.().catch(() => {});
  }
  return { apiRes: lastRes, activeModel: usedModel };
}

async function parseStepStream(apiRes, onTextChunk) {
  const reader = apiRes.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let sseBuffer = "";
  const capturedParts = [];

  function processEventLine(line) {
    if (!line.startsWith("data: ")) return;
    const jsonStr = line.slice(6).trim();
    if (!jsonStr || jsonStr === "[DONE]") return;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      return;
    }

    const parts = parsed?.candidates?.[0]?.content?.parts || [];
    const textForwardParts = [];
    for (const part of parts) {
      if (part.functionCall || part.thoughtSignature || part.thought || (part.text && part.text.length > 0)) {
        capturedParts.push(part);
      }
      if (part.text || part.thought) {
        textForwardParts.push({
          ...(part.text !== undefined ? { text: part.text } : {}),
          ...(part.thought !== undefined ? { thought: part.thought } : {}),
        });
      }
    }

    if (textForwardParts.length > 0 && typeof onTextChunk === "function") {
      onTextChunk({
        candidates: [{ content: { parts: textForwardParts, role: "model" }, index: 0 }],
      });
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() || "";
    for (const line of lines) processEventLine(line);
  }
  if (sseBuffer.trim()) {
    for (const line of sseBuffer.split("\n")) processEventLine(line);
  }

  return capturedParts;
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
        passcodeRequired: Boolean((process.env.STUDIO_PASSCODE || "").trim()),
        defaultModel: "gemini-3.8-flash",
        agenticTools: true,
      })
    );
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  if (!verifyStudioPasscode(req)) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: "Invalid or missing Studio Passcode. Configure it in Settings -> Studio Passcode.",
      })
    );
  }

  const rate = checkRateLimit(req);
  if (!rate.allowed) {
    res.statusCode = 429;
    res.setHeader("Retry-After", String(rate.retryAfterSec));
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: `Rate limit exceeded. Please wait ${rate.retryAfterSec}s before sending another request.`,
      })
    );
  }

  const {
    prompt,
    model,
    apiKey,
    history,
    systemInstruction,
    stream,
    mode = "agentic",
    webSearch = true,
    cotEnabled = true,
    githubToken,
    attachments,
  } = req.body || {};

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

  const workingContents = buildSanitizedContents(history, prompt, attachments);
  if (workingContents.length === 0) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Prompt cannot be empty." }));
  }

  const targetModel = resolveActiveModel(model);
  const candidateModels = [...new Set([targetModel, ...FALLBACK_MODELS])];
  const finalSysText = buildAgentSystemPrompt(systemInstruction, {
    mode,
    webSearchEnabled: webSearch !== false,
    cotEnabled: cotEnabled !== false,
  });

  const allowMutations = String(mode).toLowerCase() !== "ask";
  const toolDeclarations = getToolDeclarations({
    webSearchEnabled: webSearch !== false,
    allowMutations,
  });

  const shouldStream = stream !== false;
  const maxSteps = String(mode).toLowerCase() === "ask" ? 3 : 6;
  const effectiveGithubToken = (githubToken || process.env.GITHUB_TOKEN || "").trim();

  const executedTools = [];
  const createdArtifacts = [];
  const savedRules = [];
  let stickyModel = null;
  let sseHeadersSent = false;

  const clientAbort = new AbortController();
  if (typeof res.on === "function") {
    res.on("close", () => {
      if (!res.writableEnded) clientAbort.abort();
    });
  }

  const ensureSseHeaders = (activeModel) => {
    if (!sseHeadersSent) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Antigravity-Model": activeModel,
      });
      sseHeadersSent = true;
      sendSse(res, { ag_event: "meta", model: activeModel });
    }
  };

  try {
    let finalNonStreamParts = [];
    let finalModelUsed = targetModel;

    for (let step = 0; step < maxSteps; step++) {
      if (clientAbort.signal.aborted) break;
      const stepModels = stickyModel
        ? [...new Set([stickyModel, ...candidateModels])]
        : candidateModels;
      const isFinalWrapStep = step === maxSteps - 1;

      const bodyObj = {
        contents: workingContents,
        systemInstruction: { parts: [{ text: finalSysText }] },
        ...(isFinalWrapStep ? {} : { tools: toolDeclarations }),
      };

      const { apiRes, activeModel } = await fetchGeminiWithFallback({
        candidateModels: stepModels,
        bodyObj,
        activeKey,
        shouldStream,
        externalSignal: clientAbort.signal,
      });
      finalModelUsed = activeModel;

      if (!apiRes || !apiRes.ok) {
        let errMessage = `Gemini API HTTP ${apiRes?.status || 500}`;
        try {
          const errJson = await apiRes.json();
          errMessage = errJson?.error?.message || errMessage;
        } catch (e) {
          errMessage = (await apiRes?.text?.().catch(() => errMessage)) || errMessage;
        }

        if (!sseHeadersSent) {
          res.statusCode = apiRes?.status || 502;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: errMessage }));
        }
        sendSse(res, { ag_event: "error", error: errMessage });
        return res.end();
      }

      stickyModel = activeModel;
      let stepParts = [];

      if (shouldStream && apiRes.body) {
        ensureSseHeaders(activeModel);
        stepParts = await parseStepStream(apiRes, (chunk) => sendSse(res, chunk));
      } else {
        const data = await apiRes.json();
        stepParts = data?.candidates?.[0]?.content?.parts || [];
        finalNonStreamParts = stepParts;
      }

      const functionCallParts = stepParts.filter((p) => p.functionCall);
      if (functionCallParts.length === 0 || isFinalWrapStep) {
        break;
      }

      workingContents.push({ role: "model", parts: stepParts });

      const functionResponses = [];
      for (const fcPart of functionCallParts) {
        const fc = fcPart.functionCall;
        const toolCallMeta = {
          name: fc.name,
          args: fc.args || {},
          status: "running",
        };
        if (shouldStream) {
          sendSse(res, { ag_event: "tool_start", tool: toolCallMeta });
        }

        const { output } = await executeToolCall(fc.name, fc.args || {}, {
          githubToken: effectiveGithubToken,
          onArtifact: (art) => {
            createdArtifacts.push(art);
            if (shouldStream) sendSse(res, { ag_event: "artifact", artifact: art });
          },
          onRuleSaved: (rule) => {
            savedRules.push(rule);
            if (shouldStream) sendSse(res, { ag_event: "rule_saved", rule });
          },
        });

        const completedTool = {
          name: fc.name,
          args: fc.args || {},
          status: output?.error ? "error" : "done",
          resultPreview: extractCompactPreview(output),
        };
        executedTools.push(completedTool);
        if (shouldStream) {
          sendSse(res, { ag_event: "tool_done", tool: completedTool });
        }

        functionResponses.push({
          functionResponse: {
            ...(fc.id ? { id: fc.id } : {}),
            name: fc.name,
            response: { result: output },
          },
        });
      }

      workingContents.push({ role: "user", parts: functionResponses });
    }

    if (shouldStream) {
      if (!sseHeadersSent) ensureSseHeaders(finalModelUsed);
      sendSse(res, { ag_event: "done", model: finalModelUsed });
      return res.end();
    }

    let thinking = "";
    let cleanContent = "";
    for (const part of finalNonStreamParts) {
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
    res.setHeader("X-Antigravity-Model", finalModelUsed);
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        content: cleanContent,
        thinking,
        model: finalModelUsed,
        tools: executedTools,
        artifacts: createdArtifacts,
        rules: savedRules,
      })
    );
  } catch (error) {
    if (clientAbort.signal.aborted) {
      return res.end();
    }
    console.error("Proxy Gemini error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: error.message }));
    }
    try {
      sendSse(res, { ag_event: "error", error: error.message });
    } catch (e) {}
    return res.end();
  }
};
