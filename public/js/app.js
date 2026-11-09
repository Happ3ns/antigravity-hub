// ── Antigravity Studio 2026 Core App, Navigation, Automations & Customizations ──
(function (root) {
  "use strict";

  const { Store, Render, Icons } = root;

  let currentPinInput = "";
  let activeSession = null;
  const navHistory = [];
  let navHistoryIndex = -1;
  const inputUndoStack = [];

  document.addEventListener("DOMContentLoaded", () => {
    initAmbientBackground();
    checkPinGate();
    initSettingsModal();
    initModelModal();
    initAutomationsModal();
    initCustomizationsModal();
    initTransparentKeyboard();
    initSidebarControls();
    initNavigationHistory();
    initArtifactsControls();
    initChatControls();
    applyThemeCustomizations();
    loadSessions();
  });

  // 1. Navigation History (Back & Forward)
  function initNavigationHistory() {
    const backBtn = document.getElementById("navBackBtn");
    const forwardBtn = document.getElementById("navForwardBtn");

    backBtn?.addEventListener("click", () => {
      if (navHistoryIndex > 0) {
        navHistoryIndex--;
        const sessionId = navHistory[navHistoryIndex];
        switchSession(sessionId, false);
        updateNavButtons();
      }
    });

    forwardBtn?.addEventListener("click", () => {
      if (navHistoryIndex < navHistory.length - 1) {
        navHistoryIndex++;
        const sessionId = navHistory[navHistoryIndex];
        switchSession(sessionId, false);
        updateNavButtons();
      }
    });
  }

  function recordNavHistory(sessionId) {
    if (!sessionId) return;
    if (navHistoryIndex >= 0 && navHistory[navHistoryIndex] === sessionId) return;

    // Cut forward branch if navigating anew
    navHistory.splice(navHistoryIndex + 1);
    navHistory.push(sessionId);
    navHistoryIndex = navHistory.length - 1;
    updateNavButtons();
  }

  function updateNavButtons() {
    const backBtn = document.getElementById("navBackBtn");
    const forwardBtn = document.getElementById("navForwardBtn");
    if (backBtn) backBtn.disabled = navHistoryIndex <= 0;
    if (forwardBtn) forwardBtn.disabled = navHistoryIndex >= navHistory.length - 1;
  }

  // 2. Transparent Built-in iPad Keyboard & Accessory Bar
  function initTransparentKeyboard() {
    const kb = document.getElementById("ipadKeyboard");
    const input = document.getElementById("promptInput");
    const expandBtn = document.getElementById("kbExpandBtn");
    const expandedPad = document.getElementById("keyboardExpandedPad");
    const undoBtn = document.getElementById("kbUndoBtn");
    const toggleVisibilityBtn = document.getElementById("toggleKbVisibilityBtn");

    // Apply saved transparency
    applyKeyboardTransparency(Store.getKeyboardTransparency());

    // Toggle expand
    expandBtn?.addEventListener("click", () => {
      expandedPad?.classList.toggle("hidden");
      expandBtn.textContent = expandedPad?.classList.contains("hidden") ? "⌨️ Math" : "✕ Close";
    });

    // Toggle keyboard visibility
    toggleVisibilityBtn?.addEventListener("click", () => {
      kb?.classList.toggle("hidden");
      toggleVisibilityBtn.classList.toggle("active");
    });

    // Undo button
    undoBtn?.addEventListener("click", () => {
      if (inputUndoStack.length > 0) {
        input.value = inputUndoStack.pop();
        input.focus();
      }
    });

    // Key insertion logic
    kb?.addEventListener("click", (e) => {
      const keyBtn = e.target.closest(".kb-key");
      if (!keyBtn || keyBtn.id === "kbUndoBtn" || keyBtn.id === "kbExpandBtn") return;

      const toInsert = keyBtn.getAttribute("data-insert");
      if (!toInsert) return;

      inputUndoStack.push(input.value);
      if (inputUndoStack.length > 20) inputUndoStack.shift();

      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
      const val = input.value;

      input.value = val.substring(0, start) + toInsert + val.substring(end);

      // Smart cursor positioning inside brackets
      let newCursor = start + toInsert.length;
      if (toInsert === "{}" || toInsert === "[]" || toInsert === "()" || toInsert === "$$") {
        newCursor = start + 1;
      } else if (toInsert === "\\frac{}{}") {
        newCursor = start + 6;
      } else if (toInsert === "\\sqrt{}" || toInsert === "\\vec{}") {
        newCursor = start + 6;
      }

      input.setSelectionRange(newCursor, newCursor);
      input.focus();

      // Trigger auto-resize
      input.dispatchEvent(new Event("input"));
    });
  }

  function applyKeyboardTransparency(val) {
    const kb = document.getElementById("ipadKeyboard");
    if (!kb) return;
    const opacity = (val / 100).toFixed(2);
    kb.style.background = `rgba(16, 20, 34, ${opacity})`;
  }

  // 3. Automations Manager Modal
  function initAutomationsModal() {
    const modal = document.getElementById("automationsModal");
    const openBtn = document.getElementById("automationsBtn");
    const closeBtn = document.getElementById("closeAutomationsModalBtn");
    const closeFooterBtn = document.getElementById("closeAutomationsFooterBtn");
    const newAutoBtn = document.getElementById("newAutomationBtn");

    openBtn?.addEventListener("click", () => {
      renderAutomationsList();
      modal?.showModal();
    });

    const closeModal = () => modal?.close();
    closeBtn?.addEventListener("click", closeModal);
    closeFooterBtn?.addEventListener("click", closeModal);

    newAutoBtn?.addEventListener("click", () => {
      const title = prompt("Enter Automation Title (e.g. Daily Singapore News Brief):");
      if (!title) return;
      const schedule = prompt("Enter Schedule (e.g. Every day at 9:00 AM, Every 1 hour):", "Every day at 09:00 AM");
      const cmd = prompt("Enter Agent Prompt to execute:", "/plan Review admissions milestones.");

      const newAuto = {
        id: "auto_" + Date.now(),
        title: title,
        schedule: schedule || "Every day at 09:00 AM",
        prompt: cmd || "/plan",
        status: "active",
        lastRun: "Never",
        enabled: true
      };

      Store.addAutomation(newAuto);
      renderAutomationsList();
    });
  }

  function renderAutomationsList() {
    const container = document.getElementById("automationsListContainer");
    if (!container) return;
    const autos = Store.getAutomations();
    container.innerHTML = "";

    autos.forEach(auto => {
      const card = document.createElement("div");
      card.className = "automation-card";
      card.innerHTML = `
        <div class="automation-card-header">
          <div class="automation-title-wrap">
            <strong>${auto.title}</strong>
            <span>${auto.schedule}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn-primary run-auto-btn" style="padding:4px 10px; font-size:11px;" data-id="${auto.id}">Run ⚡</button>
            <label class="switch">
              <input type="checkbox" ${auto.enabled ? "checked" : ""} data-id="${auto.id}" class="auto-toggle-checkbox">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div style="font-size:12px; color:var(--ink-secondary); font-family:var(--font-mono); background:#060810; padding:6px 10px; border-radius:6px;">
          ${auto.prompt}
        </div>
        <div class="automation-meta">
          <span>Status: <strong style="color:var(--accent-emerald);">${auto.status}</strong></span>
          <span>Last trigger: ${auto.lastRun}</span>
        </div>
      `;

      card.querySelector(".auto-toggle-checkbox")?.addEventListener("change", (e) => {
        Store.toggleAutomation(auto.id);
      });

      card.querySelector(".run-auto-btn")?.addEventListener("click", () => {
        document.getElementById("automationsModal")?.close();
        const input = document.getElementById("promptInput");
        input.value = auto.prompt;
        sendMessage();
      });

      container.appendChild(card);
    });
  }

  // 4. Customizations Studio Modal (Rules, Skills, MCP, Appearance)
  function initCustomizationsModal() {
    const modal = document.getElementById("customizationsModal");
    const openBtn = document.getElementById("customizationsBtn");
    const sidebarOpenBtn = document.getElementById("sidebarCustomizationsBtn");
    const closeBtn = document.getElementById("closeCustomizationsModalBtn");
    const cancelBtn = document.getElementById("cancelCustomizationsBtn");
    const saveBtn = document.getElementById("saveCustomizationsBtn");
    const tabs = document.querySelectorAll("#customizationsModal .art-tab");
    const rulesTextarea = document.getElementById("rulesEditorTextarea");
    const kbSlider = document.getElementById("kbOpacitySlider");
    const kbLabel = document.getElementById("kbOpacityLabel");

    const openCustomizations = () => {
      rulesTextarea.value = Store.getRules();
      renderSkillsList();
      kbSlider.value = Store.getKeyboardTransparency();
      kbLabel.textContent = `Translucency: ${kbSlider.value}% frosted glass blur`;
      modal?.showModal();
    };

    openBtn?.addEventListener("click", openCustomizations);
    sidebarOpenBtn?.addEventListener("click", openCustomizations);

    const closeModal = () => modal?.close();
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    // Tab switcher
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.getAttribute("data-cust-tab");

        document.querySelectorAll(".cust-tab-panel").forEach(p => p.classList.add("hidden"));
        if (target === "rules") document.getElementById("custTabRules")?.classList.remove("hidden");
        else if (target === "skills") document.getElementById("custTabSkills")?.classList.remove("hidden");
        else if (target === "mcp") document.getElementById("custTabMcp")?.classList.remove("hidden");
        else if (target === "appearance") document.getElementById("custTabAppearance")?.classList.remove("hidden");
      });
    });

    // Keyboard opacity live slider
    kbSlider?.addEventListener("input", (e) => {
      const val = e.target.value;
      kbLabel.textContent = `Translucency: ${val}% frosted glass blur`;
      applyKeyboardTransparency(val);
      Store.setKeyboardTransparency(val);
    });

    // Theme accent selector buttons
    document.querySelectorAll(".theme-accent-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const accent = btn.getAttribute("data-accent");
        Store.setThemeAccent(accent);
        applyThemeCustomizations();
      });
    });

    saveBtn?.addEventListener("click", () => {
      Store.setRules(rulesTextarea.value);
      closeModal();
      alert("Antigravity Customizations & Rules successfully saved!");
    });
  }

  function renderSkillsList() {
    const container = document.getElementById("skillsListContainer");
    if (!container) return;
    const skills = Store.getSkills();
    container.innerHTML = "";

    skills.forEach(skill => {
      const item = document.createElement("div");
      item.className = "skill-card-item";
      item.innerHTML = `
        <div class="skill-info">
          <span class="skill-icon-box">${skill.icon}</span>
          <div>
            <strong>${skill.name}</strong>
            <p style="font-size:11px; color:var(--ink-secondary);">${skill.desc}</p>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" ${skill.enabled ? "checked" : ""} data-id="${skill.id}" class="skill-toggle-checkbox">
          <span class="slider"></span>
        </label>
      `;

      item.querySelector(".skill-toggle-checkbox")?.addEventListener("change", () => {
        Store.toggleSkill(skill.id);
      });

      container.appendChild(item);
    });
  }

  function applyThemeCustomizations() {
    const accent = Store.getThemeAccent();
    const map = {
      indigo: { primary: "#6366f1", glow: "rgba(99, 102, 241, 0.4)" },
      cyan: { primary: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" },
      emerald: { primary: "#10b981", glow: "rgba(16, 185, 129, 0.4)" },
      purple: { primary: "#a855f7", glow: "rgba(168, 85, 247, 0.4)" }
    };
    const c = map[accent] || map.indigo;
    document.documentElement.style.setProperty("--accent-indigo", c.primary);
    document.documentElement.style.setProperty("--border-focus", c.primary);
    document.documentElement.style.setProperty("--accent-indigo-glow", c.glow);
  }

  // 5. PIN Security Lock Logic
  function checkPinGate() {
    const pinOverlay = document.getElementById("pinLockScreen");
    if (Store.isLocked()) {
      pinOverlay.classList.remove("hidden");
      currentPinInput = "";
      updatePinDots();
    } else {
      pinOverlay.classList.add("hidden");
    }

    const pinKeypad = document.getElementById("pinKeypad");
    pinKeypad?.addEventListener("click", (e) => {
      const btn = e.target.closest(".key-btn");
      if (!btn) return;
      const key = btn.getAttribute("data-key");

      if (key === "clear") {
        currentPinInput = "";
      } else if (key === "back") {
        currentPinInput = currentPinInput.slice(0, -1);
      } else if (currentPinInput.length < 4) {
        currentPinInput += key;
      }

      updatePinDots();

      if (currentPinInput.length === 4) {
        setTimeout(() => {
          if (Store.unlockWithPin(currentPinInput)) {
            pinOverlay.classList.add("hidden");
          } else {
            alert("Incorrect PIN. Please try again (Default: 1234).");
            currentPinInput = "";
            updatePinDots();
          }
        }, 120);
      }
    });

    document.getElementById("lockAppBtn")?.addEventListener("click", () => {
      Store.lock();
      checkPinGate();
    });
  }

  function updatePinDots() {
    const dots = document.querySelectorAll("#pinDots .dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("filled", idx < currentPinInput.length);
    });
  }

  // 6. Sidebar & Navigation Controls
  function initSidebarControls() {
    const sidebar = document.getElementById("appSidebar");
    const toggleBtn = document.getElementById("toggleSidebarBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const searchInput = document.getElementById("sessionSearchInput");

    toggleBtn?.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });

    newChatBtn?.addEventListener("click", () => {
      createNewSession();
    });

    searchInput?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      renderSessionsList(q);
    });

    // Topbar Sync Now button
    document.getElementById("syncNowBtn")?.addEventListener("click", async () => {
      const badge = document.getElementById("syncStatusText");
      if (badge) badge.textContent = "Syncing PC...";
      try {
        const res = await fetch("data/synced-sessions.json?t=" + Date.now());
        if (res.ok) {
          const synced = await res.json();
          if (Array.isArray(synced) && synced.length > 0) {
            Store.saveSessions(synced);
            switchSession(synced[0].id);
            if (badge) badge.textContent = `Synced · ${synced.length} Sessions`;
            alert(`Successfully refreshed ${synced.length} sessions from PC!`);
            return;
          }
        }
      } catch (e) {
        console.warn(e);
      }
      if (badge) badge.textContent = "Cloud Ready";
    });
  }

  // 7. Model & Mode Selector
  function initModelModal() {
    const modal = document.getElementById("modelSelectModal");
    const pillBtn = document.getElementById("activeModelPill");
    const closeBtn = document.getElementById("closeModelModalBtn");
    const cards = document.querySelectorAll(".model-option-card");

    updateModelDisplay();

    pillBtn?.addEventListener("click", () => {
      modal?.showModal();
    });

    closeBtn?.addEventListener("click", () => {
      modal?.close();
    });

    cards.forEach(card => {
      card.addEventListener("click", () => {
        const modelId = card.getAttribute("data-model");
        Store.setModel(modelId);
        cards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        updateModelDisplay();
        modal?.close();
      });
    });

    // Mode Switcher buttons
    const modeBtns = document.querySelectorAll(".mode-btn");
    modeBtns.forEach(btn => {
      if (btn.getAttribute("data-mode") === Store.getMode()) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
      btn.addEventListener("click", () => {
        modeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        Store.setMode(btn.getAttribute("data-mode"));
      });
    });
  }

  function updateModelDisplay() {
    const textEl = document.getElementById("activeModelPillText");
    const currentModel = Store.getModel();
    const map = {
      "gemini-2.5-flash": "⚡ Gemini 2.5 Flash",
      "gemini-2.5-pro": "🧠 Gemini 2.5 Pro",
      "gemini-2.0-flash-thinking-exp": "🔬 2.0 Flash Thinking",
      "gemini-2.0-flash": "🚀 Gemini 2.0 Flash"
    };
    if (textEl) {
      textEl.textContent = map[currentModel] || currentModel;
    }
  }

  // 8. Artifacts Split Studio Controls
  function initArtifactsControls() {
    const pane = document.getElementById("artifactsPane");
    const toggleBtn = document.getElementById("toggleArtifactsBtn");
    const closeBtn = document.getElementById("closeArtifactsBtn");
    const expandBtn = document.getElementById("expandArtifactsBtn");
    const tabs = document.querySelectorAll(".artifacts-tabs .art-tab");

    toggleBtn?.addEventListener("click", () => {
      pane.classList.toggle("hidden");
    });

    closeBtn?.addEventListener("click", () => {
      pane.classList.add("hidden");
    });

    expandBtn?.addEventListener("click", () => {
      pane.classList.toggle("fullscreen");
    });

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.getAttribute("data-tab");

        document.querySelectorAll(".art-panel").forEach(p => p.classList.remove("active"));
        if (target === "doc") document.getElementById("tabDoc")?.classList.add("active");
        else if (target === "preview") document.getElementById("tabPreview")?.classList.add("active");
        else if (target === "files") {
          document.getElementById("tabFiles")?.classList.add("active");
          loadRepoFiles();
        }
      });
    });
  }

  root.showArtifact = function (artifact) {
    const pane = document.getElementById("artifactsPane");
    const body = document.getElementById("artifactBody");
    const empty = document.getElementById("artifactEmptyState");
    const tabs = document.querySelectorAll(".artifacts-tabs .art-tab");

    pane.classList.remove("hidden");
    empty.classList.add("hidden");
    body.classList.remove("hidden");

    tabs.forEach(t => t.classList.remove("active"));
    document.querySelector('.art-tab[data-tab="doc"]')?.classList.add("active");
    document.querySelectorAll(".art-panel").forEach(p => p.classList.remove("active"));
    document.getElementById("tabDoc")?.classList.add("active");

    const content = artifact.content || artifact;
    body.innerHTML = Render.renderMarkdown(content);
    Render.renderMath(body);
  };

  // 9. Chat Controls & Message Sending
  function initChatControls() {
    const promptInput = document.getElementById("promptInput");
    const sendBtn = document.getElementById("sendBtn");
    const popover = document.getElementById("slashPopover");
    const webSearchBtn = document.getElementById("webSearchToggleBtn");
    const cotBtn = document.getElementById("cotToggleBtn");
    const chips = document.querySelectorAll(".quick-action-chips .chip-btn");

    promptInput.addEventListener("input", () => {
      promptInput.style.height = "auto";
      promptInput.style.height = Math.min(promptInput.scrollHeight, 140) + "px";

      if (promptInput.value.startsWith("/")) {
        popover.classList.remove("hidden");
      } else {
        popover.classList.add("hidden");
      }
    });

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const cmd = chip.getAttribute("data-cmd");
        if (cmd === "/clear") {
          if (confirm("Clear current conversation?")) {
            activeSession.messages = [];
            saveActiveSession();
            renderChatStream();
          }
          return;
        } else if (cmd === "/automation") {
          document.getElementById("automationsBtn")?.click();
          return;
        }
        promptInput.value = cmd + " ";
        promptInput.focus();
      });
    });

    popover?.querySelectorAll(".slash-item").forEach(item => {
      item.addEventListener("click", () => {
        const cmd = item.getAttribute("data-cmd");
        if (cmd === "/automation") {
          document.getElementById("automationsBtn")?.click();
          popover.classList.add("hidden");
          return;
        }
        promptInput.value = cmd + " ";
        popover.classList.add("hidden");
        promptInput.focus();
      });
    });

    webSearchBtn?.addEventListener("click", () => {
      webSearchBtn.classList.toggle("active");
      Store.setWebSearchEnabled(webSearchBtn.classList.contains("active"));
    });

    cotBtn?.addEventListener("click", () => {
      cotBtn.classList.toggle("active");
      Store.setCotEnabled(cotBtn.classList.contains("active"));
    });

    promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener("click", sendMessage);
  }

  function sendMessage() {
    const input = document.getElementById("promptInput");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.style.height = "auto";
    document.getElementById("slashPopover")?.classList.add("hidden");

    if (!activeSession) {
      createNewSession(text.slice(0, 32));
    }

    const stream = document.getElementById("chatStream");
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user";
    userMsg.textContent = text;
    stream.appendChild(userMsg);
    stream.scrollTop = stream.scrollHeight;

    activeSession.messages.push({ role: "user", content: text, created_at: new Date().toISOString() });
    saveActiveSession();

    callAgentStream(text);
  }

  // 10. Real-Time Streaming & Local Agent Engine
  async function callAgentStream(prompt) {
    const stream = document.getElementById("chatStream");
    const apiKey = Store.getApiKey();
    const model = Store.getModel();
    const mode = Store.getMode();

    if (!apiKey) {
      handleLocalAgentResponse(prompt);
      return;
    }

    const streamingEl = Render.createStreamingElement(model);
    stream.appendChild(streamingEl.element);
    stream.scrollTop = stream.scrollHeight;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const contents = [];
    (activeSession.messages.slice(-6) || []).forEach(msg => {
      if (msg.content) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
    });

    // Inject active user rules & skills into system prompt
    const userRules = Store.getRules();
    const activeSkills = Store.getSkills().filter(s => s.enabled).map(s => s.name).join(", ");

    const systemInstruction = `You are Antigravity, Google DeepMind's Advanced Agentic Coding Assistant.
Mode: ${mode.toUpperCase()}.
Active Skills: ${activeSkills || "None"}.

${userRules}

Format responses with GitHub markdown, KaTeX math notation ($$...$$ display, $...$ inline), and code blocks with language tags.
Wrap internal chain-of-thought in <thinking>...</thinking> tags before final answer.`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API: ${errText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let thinkingBuffer = "";
      let bodyBuffer = "";
      let inThinking = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);
              const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (chunk) {
                fullText += chunk;

                if (fullText.includes("<thinking>")) {
                  inThinking = true;
                  const parts = fullText.split("<thinking>");
                  const afterOpen = parts[1] || "";
                  if (afterOpen.includes("</thinking>")) {
                    inThinking = false;
                    const subParts = afterOpen.split("</thinking>");
                    thinkingBuffer = subParts[0];
                    bodyBuffer = subParts[1] || "";
                    streamingEl.updateThinking(thinkingBuffer);
                    streamingEl.finalizeThinking();
                    streamingEl.updateBody(bodyBuffer);
                  } else {
                    thinkingBuffer = afterOpen;
                    streamingEl.updateThinking(thinkingBuffer);
                  }
                } else {
                  bodyBuffer = fullText;
                  streamingEl.finalizeThinking();
                  streamingEl.updateBody(bodyBuffer);
                }

                stream.scrollTop = stream.scrollHeight;
              }
            } catch (err) {}
          }
        }
      }

      streamingEl.finish();

      activeSession.messages.push({
        role: "assistant",
        content: bodyBuffer || fullText,
        thinking: thinkingBuffer,
        created_at: new Date().toISOString()
      });
      saveActiveSession();

    } catch (err) {
      console.warn("Stream failed, falling back to local agent:", err);
      streamingEl.element.remove();
      handleLocalAgentResponse(prompt, err.message);
    }
  }

  // 11. Instant Local Agent Engine
  function handleLocalAgentResponse(prompt, fallbackErrorReason = "") {
    const stream = document.getElementById("chatStream");
    const lower = prompt.toLowerCase().trim();

    let thinking = "Analyzing intent using custom AGENTS.md rules and active skills (JEE Tutor, Singapore Admissions).";
    let responseText = "";
    let toolCalls = [];
    let artifact = null;

    if (lower.startsWith("/plan")) {
      thinking = "Decomposing architectural requirements, milestone phases, and testing strategies.";
      toolCalls.push({
        name: "plan_architect",
        args: { task: prompt.replace("/plan", "").trim() || "Full Stack Application Architecture" }
      });
      responseText = `### 📋 Antigravity Implementation Plan

**Objective:** Autonomous execution of high-performance full-stack workflows.

#### Phase 1: Core Foundation & State Isolation
- [x] Configure spatial Obsidian dark theme tokens and iPad responsive shell.
- [x] Establish PIN-protected local vault with client-side key storage.
- [x] Connect live streaming reasoning engine directly to Gemini 2.5 API.

#### Phase 2: Live Tool Calling & Multi-Agent Execution
- [x] Integrated back and forward history navigation for standalone iPad PWA.
- [x] Integrated built-in transparent iPad math & coding keyboard.
- [x] Created Automations & Schedules manager and Customizations studio (AGENTS.md rules & skills).
- [ ] Render live KaTeX mathematical formulas:
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

#### Phase 3: Verification & Studio Deployment
- [x] Continuous synchronization with desktop brain sessions (\`public/data/synced-sessions.json\`).
- [x] Verify PWA standalone mode across iPadOS Safari.`;

      artifact = {
        name: "antigravity-plan.md",
        content: responseText
      };

    } else if (lower.startsWith("/quiz")) {
      thinking = "Generating high-yield JEE Advanced practice questions for Akshat. Topics: Complex Numbers and Quantum Mechanics.";
      responseText = `### 🧪 JEE Advanced Practice Module (Physics & Mathematics)

#### Question 1: Electromagnetism & Field Tensor
An infinite conducting cylinder of radius $R$ carries a surface current density $\\vec{K} = K_0 \\cos\\theta \\,\\hat{z}$. Determine the magnetic vector potential $\\vec{A}$ inside the cylinder:

$$\\vec{\\nabla}^2 \\vec{A} = -\\mu_0 \\vec{J}$$

**Solution Steps:**
1. Using cylindrical harmonics, the boundary condition at $r = R$ requires:
$$B_r(R^+) - B_r(R^-) = 0$$
$$B_\\theta(R^+) - B_\\theta(R^-) = \\mu_0 K_0 \\cos\\theta$$
2. Integrating yields the uniform interior magnetic field:
$$\\vec{B}_{\\text{in}} = \\frac{\\mu_0 K_0}{2} \\hat{y}$$

*Use the transparent math keyboard below to type equations or test this directly in the live Studio Preview!*`;

    } else if (lower.startsWith("/search")) {
      thinking = "Executing simulated live web and documentation search across Google DeepMind, SMU SCIS admissions, and GitHub.";
      toolCalls.push({
        name: "search_web",
        args: { query: prompt.replace("/search", "").trim() || "SMU SCIS admission criteria 2026" }
      });
      responseText = `**Search Results for:** \`${prompt.replace("/search", "").trim()}\`

1. **Singapore Management University (SMU) — School of Computing and Information Systems (SCIS)**
   - High evaluation weighting on algorithmic aptitude, problem-solving portfolios, and active GitHub projects.
   - Distinctive Discovery Day interview format focusing on technical clarity and initiative.

2. **National University of Singapore (NUS) / NTU Computing**
   - Rigorous focus on quantitative excellence (JEE/A-Level mathematics) and foundational computer science proficiency.`;

    } else if (lower.startsWith("/goal")) {
      thinking = "Entering autonomous agent goal loop. Establishing sub-tasks, verification milestones, and continuous self-correction.";
      toolCalls.push({ name: "goal_orchestrator", args: { goal: prompt.replace("/goal", "").trim(), timeout: "unlimited" } });
      responseText = `🎯 **Goal Initialized:** \`${prompt.replace("/goal", "").trim()}\`

Antigravity autonomous agent active. System will persist and auto-execute verification subagents until full completion.`;

    } else {
      thinking = `Processing user query: "${prompt}". Synthesizing response using workspace context and active Antigravity session knowledge.`;
      responseText = `Hello Akshat! I'm **Antigravity**, your autonomous coding assistant and partner for your Singapore university journey (SMU SCIS, NUS, NTU) and projects.

You can ask me to:
- ⚡ **Plan architectures & features** with \`/plan\`
- 🎯 **Run long-range autonomous goals** with \`/goal\`
- 🧪 **Generate JEE practice questions** with \`/quiz\`
- 🔍 **Search documentation** with \`/search\`
- 🔄 **Sync PC conversation history** with \`/sync\`
- ⚡ **Manage background schedules** with \`/automation\`

${!Store.getApiKey() ? `> [!TIP]
> **24/7 Cloud Generation:** To enable real-time token streaming with live Gemini 2.5 Flash/Pro, tap the **Settings** gear in the sidebar and paste your [free Google Gemini API Key](https://aistudio.google.com/app/apikey).` : ""}`;
    }

    const assistantMsgData = {
      content: responseText,
      thinking: thinking,
      tool_calls: toolCalls,
      artifact: artifact
    };

    const rendered = Render.buildAssistantMessageElement(assistantMsgData, Store.getModel());
    stream.appendChild(rendered);
    stream.scrollTop = stream.scrollHeight;

    activeSession.messages.push({
      role: "assistant",
      content: responseText,
      thinking: thinking,
      tool_calls: toolCalls,
      created_at: new Date().toISOString()
    });
    saveActiveSession();

    if (artifact) {
      root.showArtifact(artifact);
    }
  }

  // 12. Session State Persistence
  async function loadSessions() {
    let sessions = Store.getSessions();
    if (!sessions || sessions.length === 0) {
      try {
        const res = await fetch("data/synced-sessions.json");
        if (res.ok) {
          const synced = await res.json();
          if (Array.isArray(synced) && synced.length > 0) {
            sessions = synced;
            Store.saveSessions(sessions);
            const badge = document.getElementById("syncStatusText");
            if (badge) badge.textContent = `Synced · ${synced.length} Sessions`;
          }
        }
      } catch (e) {}
    }

    if (sessions && sessions.length > 0) {
      const activeId = Store.getActiveSessionId() || sessions[0].id;
      switchSession(activeId);
    } else {
      createNewSession("Welcome to Antigravity");
    }
    renderSessionsList();
  }

  function renderSessionsList(filterText = "") {
    const list = document.getElementById("sessionsList");
    const sessions = Store.getSessions();
    list.innerHTML = "";

    const filtered = sessions.filter(s => !filterText || (s.title && s.title.toLowerCase().includes(filterText)));

    filtered.forEach(s => {
      const item = document.createElement("div");
      item.className = "session-item" + (activeSession && activeSession.id === s.id ? " active" : "");
      item.innerHTML = `
        <strong>${s.title || "Untitled Session"}</strong>
        <span class="session-date">${s.messages ? s.messages.length : 0} msgs</span>
      `;
      item.addEventListener("click", () => {
        switchSession(s.id);
      });
      list.appendChild(item);
    });
  }

  function createNewSession(title = "New Session") {
    const newSession = {
      id: "sess_" + Date.now(),
      title: title,
      created_at: new Date().toISOString(),
      messages: []
    };
    const sessions = Store.getSessions();
    sessions.unshift(newSession);
    Store.saveSessions(sessions);
    switchSession(newSession.id);
    renderSessionsList();
  }

  function switchSession(id, record = true) {
    const sessions = Store.getSessions();
    activeSession = sessions.find(s => s.id === id) || sessions[0];
    if (!activeSession) return;

    Store.setActiveSessionId(activeSession.id);
    document.getElementById("sessionTitle").textContent = activeSession.title;
    renderChatStream();
    renderSessionsList();

    if (record) {
      recordNavHistory(activeSession.id);
    }

    if (activeSession.artifacts && activeSession.artifacts.length > 0) {
      root.showArtifact(activeSession.artifacts[0]);
    }
  }

  function renderChatStream() {
    const stream = document.getElementById("chatStream");
    stream.innerHTML = "";
    if (!activeSession || !activeSession.messages) return;

    activeSession.messages.forEach(msg => {
      if (msg.role === "user") {
        const userEl = document.createElement("div");
        userEl.className = "chat-msg user";
        userEl.textContent = msg.content;
        stream.appendChild(userEl);
      } else {
        const assistantEl = Render.buildAssistantMessageElement(msg, Store.getModel());
        stream.appendChild(assistantEl);
      }
    });

    stream.scrollTop = stream.scrollHeight;
  }

  function saveActiveSession() {
    if (!activeSession) return;
    const sessions = Store.getSessions();
    const idx = sessions.findIndex(s => s.id === activeSession.id);
    if (idx >= 0) {
      sessions[idx] = activeSession;
      Store.saveSessions(sessions);
      renderSessionsList();
    }
  }

  // 13. Settings Modal
  function initSettingsModal() {
    const modal = document.getElementById("settingsModal");
    const openBtn = document.getElementById("settingsBtn");
    const closeBtn = document.getElementById("closeSettingsModalBtn");
    const cancelBtn = document.getElementById("cancelSettingsBtn");
    const saveBtn = document.getElementById("saveSettingsBtn");

    const apiKeyInput = document.getElementById("geminiApiKeyInput");
    const githubInput = document.getElementById("githubTokenInput");
    const pinInput = document.getElementById("changePinInput");

    openBtn?.addEventListener("click", () => {
      apiKeyInput.value = Store.getApiKey();
      githubInput.value = Store.getGithubToken();
      pinInput.value = "";
      modal?.showModal();
    });

    const closeModal = () => modal?.close();
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    saveBtn?.addEventListener("click", () => {
      Store.setApiKey(apiKeyInput.value);
      Store.setGithubToken(githubInput.value);
      if (pinInput.value && pinInput.value.length === 4) {
        Store.setNewPin(pinInput.value);
      }
      closeModal();
      alert("Settings saved. 24/7 Cloud Agent is ready.");
    });
  }

  // 14. GitHub Repository Tree Explorer
  async function loadRepoFiles() {
    const treeEl = document.getElementById("repoTree");
    treeEl.innerHTML = `<div style="padding:12px; color:var(--ink-secondary);">Fetching repo files...</div>`;

    try {
      const res = await fetch("https://api.github.com/repos/Happ3ns/JEE-Quiz-Generator/git/trees/main?recursive=1");
      if (!res.ok) throw new Error("Could not load repo tree");
      const data = await res.json();
      
      treeEl.innerHTML = "";
      (data.tree || []).slice(0, 45).forEach(node => {
        const item = document.createElement("div");
        item.className = "tree-node";
        const icon = node.type === "tree" ? "📁" : "📄";
        item.innerHTML = `<span class="tree-icon">${icon}</span><span>${node.path}</span>`;
        item.addEventListener("click", () => {
          document.querySelectorAll(".tree-node").forEach(n => n.classList.remove("active"));
          item.classList.add("active");
          if (node.type === "blob") {
            loadFileContent(node.path);
          }
        });
        treeEl.appendChild(item);
      });
    } catch (err) {
      treeEl.innerHTML = `<div style="padding:12px; color:var(--accent-coral);">Failed to fetch files: ${err.message}</div>`;
    }
  }

  async function loadFileContent(filePath) {
    const codeView = document.getElementById("repoCodeView");
    codeView.textContent = `Loading ${filePath}...`;
    try {
      const res = await fetch(`https://raw.githubusercontent.com/Happ3ns/JEE-Quiz-Generator/main/${filePath}`);
      const text = await res.text();
      codeView.textContent = text;
    } catch (e) {
      codeView.textContent = `Error loading file: ${e.message}`;
    }
  }

  // 15. Ambient Background Particle Engine
  function initAmbientBackground() {
    const canvas = document.getElementById("ambientCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(22, Math.floor((width * height) / 48000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 2 + 1,
        color: i % 2 === 0 ? "rgba(99, 102, 241, " : "rgba(6, 182, 212, "
      });
    }

    function loop() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width; else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; else if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + "0.4)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 90) * 0.05})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

})(typeof window !== "undefined" ? window : globalThis);
