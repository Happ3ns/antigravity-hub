// ── Markdown, Thinking Protocol & KaTeX Renderer ──
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
      return marked.parse(rawText || "");
    }
    return rawText || "";
  }

  function parseMessageContent(text) {
    let thinking = "";
    let cleanText = text || "";

    // Extract <thought> or <thinking> blocks
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

  function buildAssistantMessageElement(msgData) {
    const icons = root.Icons || { get: () => "" };
    const el = document.createElement("div");
    el.className = "chat-msg assistant";

    const { thinking, body } = parseMessageContent(msgData.content || "");

    // 1. Thinking Process Block (if present)
    if (thinking || msgData.thinking) {
      const thinkText = thinking || msgData.thinking;
      const details = document.createElement("details");
      details.className = "thinking-block";
      details.innerHTML = `
        <summary>
          <div class="thinking-summary-left">
            <span class="thinking-pulse-dot"></span>
            <span>Thinking Process</span>
          </div>
          <span class="thinking-chevron">${icons.get("chevronRight")}</span>
        </summary>
        <div class="thinking-content">${escapeHtml(thinkText)}</div>
      `;
      el.appendChild(details);
    }

    // 2. Tool Invocations (if any)
    if (msgData.tool_calls && Array.isArray(msgData.tool_calls)) {
      msgData.tool_calls.forEach(tc => {
        const toolCard = document.createElement("div");
        toolCard.className = "tool-call-card";
        const toolName = tc.name || tc.function?.name || "tool";
        const toolArgs = tc.args || tc.function?.arguments || "{}";
        
        let toolIcon = icons.get("terminal");
        if (toolName.includes("search")) toolIcon = icons.get("search");
        else if (toolName.includes("file")) toolIcon = icons.get("file");
        else if (toolName.includes("github")) toolIcon = icons.get("github");

        toolCard.innerHTML = `
          <div class="tool-call-header">
            <span class="tool-badge-pill">${toolIcon} ${toolName}</span>
            <span class="tool-status-dot" title="Executed"></span>
          </div>
          <div class="tool-call-body">${typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs, null, 2)}</div>
        `;
        el.appendChild(toolCard);
      });
    }

    // 3. Main Response Body
    if (body) {
      const bodyDiv = document.createElement("div");
      bodyDiv.className = "msg-body";
      bodyDiv.innerHTML = renderMarkdown(body);

      // Attach copy buttons to pre blocks
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

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  root.Render = {
    renderMath,
    renderMarkdown,
    parseMessageContent,
    buildAssistantMessageElement
  };

})(typeof window !== "undefined" ? window : globalThis);
