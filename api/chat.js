// ── Vercel Serverless Function: Cloud Agent & Gemini API ──
const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt, model, apiKey, history } = req.body || {};
  const activeKey = apiKey || process.env.GEMINI_API_KEY;

  if (!activeKey) {
    return res.status(400).json({
      error: "No Gemini API key provided. Add it in Settings on your iPad or in Vercel environment variables."
    });
  }

  // Map requested model to Gemini endpoint
  let targetModel = "gemini-2.5-flash";
  if (model && model.includes("pro")) targetModel = "gemini-2.5-pro";
  else if (model && model.includes("thinking")) targetModel = "gemini-2.5-flash"; // Thinking parameter enabled

  const systemInstruction = `You are Antigravity, Google DeepMind's Advanced Agentic Coding Assistant running in the cloud for user Akshat on his iPad.
Format your responses with clear markdown, LaTeX formulas ($$...$$ or $...$), and structured plans.
When solving complex problems or planning, wrap your internal reasoning in <thinking>...</thinking> tags before outputting the final user-facing response.`;

  // Format contents array
  const contents = [];
  (history || []).forEach(msg => {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    });
  });
  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  const requestBody = JSON.stringify({
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`;

  try {
    const apiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(apiRes.status).json({ error: `Gemini API error: ${errText}` });
    }

    const data = await apiRes.json();
    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || "No response received.";

    // Parse thinking blocks if present
    let thinking = "";
    let cleanContent = rawText;
    const thinkMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      cleanContent = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
    }

    // Check if an artifact was generated (e.g. ```markdown ... ``` or plan)
    let artifact = null;
    if (cleanContent.includes("# Plan") || cleanContent.includes("# Implementation Plan") || cleanContent.includes("```artifact")) {
      artifact = {
        title: "Agent Artifact",
        content: cleanContent
      };
    }

    return res.status(200).json({
      content: cleanContent,
      thinking: thinking,
      tool_calls: candidate?.content?.parts?.filter(p => p.functionCall).map(p => ({
        name: p.functionCall.name,
        args: p.functionCall.args
      })) || [],
      artifact: artifact
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
