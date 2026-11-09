// ── Main UI Orchestrator & iPad Touch Event Loop ──
(function (root) {
  "use strict";

  const { Store, Render, Icons } = root;

  let currentPinInput = "";
  let activeSession = null;

  document.addEventListener("DOMContentLoaded", () => {
    initAmbientBackground();
    checkPinGate();
    initSettingsModal();
    initSidebarControls();
    initArtifactsControls();
    initChatControls();
    loadSessions();
  });

  // 1. PIN Gate Logic
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
    pinKeypad.addEventListener("click", (e) => {
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

  // 2. Sidebar & Session Navigation
  function initSidebarControls() {
    const sidebar = document.getElementById("appSidebar");
    const toggleBtn = document.getElementById("toggleSidebarBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const searchInput = document.getElementById("sessionSearchInput");
    const modelSelect = document.getElementById("modelSelect");

    if (modelSelect) {
      modelSelect.value = Store.getModel();
      modelSelect.addEventListener("change", () => {
        Store.setModel(modelSelect.value);
        updateModelBadge();
      });
    }

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
  }

  function updateModelBadge() {
    const badge = document.getElementById("currentModelBadge");
    const m = Store.getModel();
    if (badge) {
      if (m.includes("thinking")) badge.textContent = "Thinking 2.5";
      else if (m.includes("pro")) badge.textContent = "Gemini 2.5 Pro";
      else badge.textContent = "Gemini 2.5 Flash";
    }
  }

  // 3. Artifacts Pane Controls
  function initArtifactsControls() {
    const pane = document.getElementById("artifactsPane");
    const toggleBtn = document.getElementById("toggleArtifactsBtn");
    const closeBtn = document.getElementById("closeArtifactsBtn");
    const tabs = document.querySelectorAll(".artifacts-tabs .art-tab");

    toggleBtn?.addEventListener("click", () => {
      pane.classList.toggle("hidden");
    });

    closeBtn?.addEventListener("click", () => {
      pane.classList.add("hidden");
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

  // 4. Chat & Message Interaction
  function initChatControls() {
    const promptInput = document.getElementById("promptInput");
    const sendBtn = document.getElementById("sendBtn");
    const popover = document.getElementById("slashPopover");

    // Auto-grow textarea
    promptInput.addEventListener("input", () => {
      promptInput.style.height = "auto";
      promptInput.style.height = Math.min(promptInput.scrollHeight, 140) + "px";

      if (promptInput.value.startsWith("/")) {
        popover.classList.remove("hidden");
      } else {
        popover.classList.add("hidden");
      }
    });

    // Slash popover click
    popover.querySelectorAll(".slash-item").forEach(item => {
      item.addEventListener("click", () => {
        const cmd = item.getAttribute("data-cmd");
        promptInput.value = cmd + " ";
        popover.classList.add("hidden");
        promptInput.focus();
      });
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

    // Append user message
    const stream = document.getElementById("chatStream");
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user";
    userMsg.textContent = text;
    stream.appendChild(userMsg);
    stream.scrollTop = stream.scrollHeight;

    // Save user message to active session
    activeSession.messages.push({ role: "user", content: text, created_at: new Date().toISOString() });
    saveActiveSession();

    // Call Cloud Agent API
    callAgentApi(text);
  }

  async function callAgentApi(prompt) {
    const stream = document.getElementById("chatStream");
    const assistantEl = document.createElement("div");
    assistantEl.className = "chat-msg assistant";
    assistantEl.innerHTML = `<div class="msg-body" style="color:var(--ink-muted); display:flex; align-items:center; gap:8px;"><span class="thinking-pulse-dot"></span><span>Antigravity is reasoning...</span></div>`;
    stream.appendChild(assistantEl);
    stream.scrollTop = stream.scrollHeight;
    try {
      let data = null;
      let serverSuccess = false;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            model: Store.getModel(),
            apiKey: Store.getApiKey(),
            history: activeSession.messages.slice(-8)
          })
        });
        if (response.ok) {
          data = await response.json();
          serverSuccess = true;
        }
      } catch (e) {
        serverSuccess = false;
      }
      if (!serverSuccess) {
        const apiKey = Store.getApiKey();
        if (!apiKey) {
          throw new Error("No Gemini API key found. Tap the Settings gear icon in the sidebar on your iPad and enter your key.");
        }
        let targetModel = "gemini-2.5-flash";
        if (Store.getModel().includes("pro")) targetModel = "gemini-2.5-pro";
        const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent?key=" + apiKey;
        const contents = [];
        (activeSession.messages.slice(-8) || []).forEach(msg => {
          contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
        });
        contents.push({ role: "user", parts: [{ text: prompt }] });
        const apiRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: { parts: [{ text: "You are Antigravity, Google DeepMind's Advanced Agentic Coding Assistant. Format responses with clean markdown, LaTeX math ($$...$$ or $...$), and wrap internal chain-of-thought in <thinking>...</thinking> tags before the final output." }] }
          })
        });
        if (!apiRes.ok) {
          const errText = await apiRes.text();
          throw new Error("Gemini API Error: " + errText);
        }
        const rawData = await apiRes.json();
        const rawText = rawData.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
        let thinking = "";
        let cleanContent = rawText;
        const thinkMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        if (thinkMatch) {
          thinking = thinkMatch[1].trim();
          cleanContent = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
        }
        data = { content: cleanContent, thinking: thinking, tool_calls: [] };
      }
      assistantEl.remove();
      const renderedMsg = Render.buildAssistantMessageElement(data);
      stream.appendChild(renderedMsg);
      stream.scrollTop = stream.scrollHeight;
      activeSession.messages.push({ role: "assistant", content: data.content, thinking: data.thinking, tool_calls: data.tool_calls || [], created_at: new Date().toISOString() });
      saveActiveSession();
      if (data.artifact) { showArtifact(data.artifact); }
    } catch (err) {
      console.error(err);
      assistantEl.innerHTML = `<div class="msg-body" style="border-color:var(--accent-coral); color:#fca5a5;"><strong>Agent Error:</strong> ${err.message}<br><span style="font-size:12px; color:var(--ink-secondary);">Tap the Settings gear in the bottom-left sidebar to enter your Gemini API Key.</span></div>`;
    }
  }
  function showArtifact(artifact) {
    const pane = document.getElementById("artifactsPane");
    const body = document.getElementById("artifactBody");
    const empty = document.getElementById("artifactEmptyState");
    
    pane.classList.remove("hidden");
    empty.classList.add("hidden");
    body.classList.remove("hidden");

    body.innerHTML = Render.renderMarkdown(artifact.content || artifact);
    Render.renderMath(body);
  }

  // 5. Session State Management
  async function loadSessions() {
    let sessions = Store.getSessions();
    if (!sessions || sessions.length === 0) {
      try {
        const res = await fetch("/data/synced-sessions.json");
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
        <span style="font-size:10.5px; color:var(--ink-muted); font-family:var(--font-mono);">${s.messages ? s.messages.length : 0} msgs</span>
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

  function switchSession(id) {
    const sessions = Store.getSessions();
    activeSession = sessions.find(s => s.id === id) || sessions[0];
    if (!activeSession) return;

    Store.setActiveSessionId(activeSession.id);
    document.getElementById("sessionTitle").textContent = activeSession.title;
    renderChatStream();
    renderSessionsList();

    if (activeSession.artifacts && activeSession.artifacts.length > 0) {
      showArtifact(activeSession.artifacts[0]);
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
        const assistantEl = Render.buildAssistantMessageElement(msg);
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

  // 6. Settings Modal
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
      modal.showModal();
    });

    const closeModal = () => modal.close();
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    saveBtn?.addEventListener("click", () => {
      Store.setApiKey(apiKeyInput.value);
      Store.setGithubToken(githubInput.value);
      if (pinInput.value && pinInput.value.length === 4) {
        Store.setNewPin(pinInput.value);
      }
      closeModal();
      alert("Settings saved successfully.");
    });
  }

  // 7. GitHub Repository Tree Explorer
  async function loadRepoFiles() {
    const treeEl = document.getElementById("repoTree");
    treeEl.innerHTML = `<div style="padding:16px; color:var(--ink-secondary);">Fetching Happ3ns/JEE-Quiz-Generator file tree...</div>`;

    try {
      const res = await fetch("https://api.github.com/repos/Happ3ns/JEE-Quiz-Generator/git/trees/main?recursive=1");
      if (!res.ok) throw new Error("Could not load repo tree");
      const data = await res.json();
      
      treeEl.innerHTML = "";
      (data.tree || []).slice(0, 40).forEach(node => {
        const item = document.createElement("div");
        item.className = "tree-node";
        const icon = node.type === "tree" ? "📁" : "📄";
        item.innerHTML = `<span class="tree-icon">${icon}</span><span>${node.path}</span>`;
        item.addEventListener("click", () => {
          if (node.type === "blob") {
            loadFileContent(node.path);
          }
        });
        treeEl.appendChild(item);
      });
    } catch (err) {
      treeEl.innerHTML = `<div style="padding:16px; color:var(--accent-coral);">Failed to fetch GitHub files: ${err.message}</div>`;
    }
  }

  async function loadFileContent(filePath) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/Happ3ns/JEE-Quiz-Generator/main/${filePath}`);
      const text = await res.text();
      showArtifact({
        title: filePath,
        content: `### \`${filePath}\`\n\`\`\`javascript\n${text}\n\`\`\``
      });
    } catch (e) {
      alert("Could not load file content: " + e.message);
    }
  }

  // 8. Ambient Reactive Canvas
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
    const count = Math.min(28, Math.floor((width * height) / 40000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
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
        ctx.fillStyle = p.color + "0.5)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 100) * 0.06})`;
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
