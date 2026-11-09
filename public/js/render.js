// ── Antigravity Studio Markdown, Math & Streaming Message Engine ──
(function (root) {
  "use strict";

  function renderMath(container) {
    if (typeof renderMathInElement === "function" && container) {
      try {
        renderMathInElement(container, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }
  }

  function renderMarkdown(rawText) {
    if (typeof marked !== "undefined" && marked.parse) {
      try {
        return marked.parse(rawText || "");
      } catch (e) {
        return escapeHtml(rawText || "");
      }
    }
    return escapeHtml(rawText || "");
  }

  function parseMessageContent(text) {
    let thinking = "";
    let cleanText = text || "";

    const thinkMatch = cleanText.match(/<(?:thought|thinking)>([\s\S]*?)<\/(?:thought|thinking)>/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      cleanText = cleanText.replace(/<(?:thought|thinking)>[\s\S]*?<\/(?:thought|thinking)>/gi, "").trim();
    }

    return {
      thinking,
      body: cleanText
    };
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function buildAssistantMessageElement(msgData, modelName = "Gemini 2.5 Flash") {
    const icons = root.Icons || { get: () => "" };
    const el = document.createElement("div");
    el.className = "chat-msg assistant";

    const { thinking, body } = parseMessageContent(msgData.content || "");
    const actualThinking = thinking || msgData.thinking || "";

    // 1. Header with DeepMind Antigravity Avatar
    const header = document.createElement("div");
    header.className = "assistant-header";
    header.innerHTML = `
      <div class="assistant-avatar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/>
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>
        </svg>
      </div>
      <span class="assistant-title">Antigravity</span>
      <span class="assistant-model-tag">${msgData.model || modelName}</span>
    `;
    el.appendChild(header);

    // 2. Expandable Thinking Process Block
    if (actualThinking) {
      const details = document.createElement("details");
      details.className = "thinking-block";
      details.innerHTML = `
        <summary>
          <div class="thinking-summary-left">
            <span class="thinking-pulse-dot"></span>
            <span>Thinking Process</span>
            <span class="thinking-time-chip">· deep reasoning</span>
          </div>
          <span class="thinking-chevron">${icons.get("chevronRight")}</span>
        </summary>
        <div class="thinking-content">${escapeHtml(actualThinking)}</div>
      `;
      el.appendChild(details);
    }

    // 3. Tool Calls (if any)
    if (msgData.tool_calls && Array.isArray(msgData.tool_calls) && msgData.tool_calls.length > 0) {
      msgData.tool_calls.forEach(tc => {
        const toolCard = document.createElement("div");
        toolCard.className = "tool-call-card";
        const toolName = tc.name || tc.function?.name || "tool";
        const toolArgs = tc.args || tc.function?.arguments || "{}";
        
        let toolIcon = icons.get("terminal");
        if (toolName.includes("search")) toolIcon = icons.get("search");
        else if (toolName.includes("file") || toolName.includes("write") || toolName.includes("edit")) toolIcon = icons.get("file");
        else if (toolName.includes("github")) toolIcon = icons.get("github");

        toolCard.innerHTML = `
          <div class="tool-call-header">
            <span class="tool-badge-pill">${toolIcon} ${toolName}</span>
            <span class="tool-status-pill">
              ${icons.get("check")} Executed
            </span>
          </div>
          <div class="tool-call-body">${typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs, null, 2)}</div>
        `;
        el.appendChild(toolCard);
      });
    }

    // 4. Artifact Reference Card (if artifact is detected)
    if (msgData.artifact || (body && body.includes("jee-analysis.md"))) {
      const artCard = document.createElement("div");
      artCard.className = "chat-artifact-card";
      artCard.innerHTML = `
        <div class="artifact-card-left">
          <div class="artifact-card-icon">${icons.get("file")}</div>
          <div>
            <div class="artifact-card-title">${msgData.artifact?.name || "jee-analysis.md"}</div>
            <div class="artifact-card-sub">JEE Exam Analysis &amp; Math Artifact</div>
          </div>
        </div>
        <div class="artifact-card-action">Open in Studio →</div>
      `;
      artCard.addEventListener("click", () => {
        if (root.showArtifact) root.showArtifact(msgData.artifact || { name: "jee-analysis.md" });
      });
      el.appendChild(artCard);
    }

    // 5. Main Markdown Response Body
    if (body) {
      const bodyDiv = document.createElement("div");
      bodyDiv.className = "msg-body";
      bodyDiv.innerHTML = renderMarkdown(body);

      // Attach copy buttons to code blocks
      bodyDiv.querySelectorAll("pre").forEach(pre => {
        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-code-btn";
        copyBtn.innerHTML = `${icons.get("copy")} Copy`;
        copyBtn.addEventListener("click", () => {
          const code = pre.querySelector("code")?.innerText || pre.innerText;
          navigator.clipboard.writeText(code).then(() => {
            copyBtn.innerHTML = `${icons.get("check")} Copied!`;
            setTimeout(() => { copyBtn.innerHTML = `${icons.get("copy")} Copy`; }, 2000);
          });
        });
        pre.appendChild(copyBtn);
      });

      renderMath(bodyDiv);
      el.appendChild(bodyDiv);
    }

    return el;
  }

  // Live Streaming Container Builder
  function createStreamingElement(modelName = "Gemini 2.5 Flash") {
    const icons = root.Icons || { get: () => "" };
    const el = document.createElement("div");
    el.className = "chat-msg assistant streaming";

    const header = document.createElement("div");
    header.className = "assistant-header";
    header.innerHTML = `
      <div class="assistant-avatar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/>
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>
        </svg>
      </div>
      <span class="assistant-title">Antigravity</span>
      <span class="assistant-model-tag">${modelName}</span>
    `;
    el.appendChild(header);

    // Thinking Block (Live)
    const thinkingBlock = document.createElement("details");
    thinkingBlock.className = "thinking-block";
    thinkingBlock.open = true;
    thinkingBlock.innerHTML = `
      <summary>
        <div class="thinking-summary-left">
          <span class="thinking-pulse-dot"></span>
          <span class="thinking-status-label">Reasoning...</span>
          <span class="thinking-time-chip" id="streamingTimer">0.0s</span>
        </div>
        <span class="thinking-chevron">${icons.get("chevronRight")}</span>
      </summary>
      <div class="thinking-content" style="opacity:0.85;">Initializing thought process...</div>
    `;
    el.appendChild(thinkingBlock);

    // Body
    const bodyDiv = document.createElement("div");
    bodyDiv.className = "msg-body";
    bodyDiv.style.display = "none";
    el.appendChild(bodyDiv);

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const timerEl = el.querySelector("#streamingTimer");
      if (timerEl) timerEl.textContent = `${elapsed}s`;
    }, 100);

    return {
      element: el,
      updateThinking: function (text) {
        thinkingBlock.style.display = "block";
        const contentEl = thinkingBlock.querySelector(".thinking-content");
        if (contentEl) contentEl.textContent = text;
      },
      finalizeThinking: function () {
        clearInterval(timerInterval);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const label = thinkingBlock.querySelector(".thinking-status-label");
        const timerEl = thinkingBlock.querySelector("#streamingTimer");
        if (label) label.textContent = "Thought Process";
        if (timerEl) timerEl.textContent = `· Thought for ${elapsed}s`;
        thinkingBlock.open = false; // collapse smoothly
      },
      updateBody: function (markdownText) {
        bodyDiv.style.display = "block";
        bodyDiv.innerHTML = renderMarkdown(markdownText);
        renderMath(bodyDiv);
      },
      finish: function () {
        clearInterval(timerInterval);
        thinkingBlock.open = false;
        renderMath(bodyDiv);
      }
    };
  }

  root.Render = {
    renderMath,
    renderMarkdown,
    parseMessageContent,
    buildAssistantMessageElement,
    createStreamingElement,
    escapeHtml
  };

})(typeof window !== "undefined" ? window : globalThis);
