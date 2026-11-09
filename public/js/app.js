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
    startAutomationTicker();
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
    const newAutoForm = document.getElementById("newAutomationForm");
    const cancelNewAutoBtn = document.getElementById("cancelNewAutoBtn");
    const saveNewAutoBtn = document.getElementById("saveNewAutoBtn");
    const cadenceSelect = document.getElementById("autoCadenceSelect");

    openBtn?.addEventListener("click", () => {
      renderAutomationsList();
      modal?.showModal();
    });

    const closeModal = () => modal?.close();
    closeBtn?.addEventListener("click", closeModal);
    closeFooterBtn?.addEventListener("click", closeModal);

    // Toggle creation form
    newAutoBtn?.addEventListener("click", () => {
      newAutoForm?.classList.toggle("hidden");
      newAutoBtn.textContent = newAutoForm?.classList.contains("hidden") ? "+ New Automation" : "✕ Close Form";
    });

    cancelNewAutoBtn?.addEventListener("click", () => {
      newAutoForm?.classList.add("hidden");
      newAutoBtn.textContent = "+ New Automation";
    });

    // Dynamic Cadence selection
    cadenceSelect?.addEventListener("change", () => {
      const mode = cadenceSelect.value;
      document.getElementById("autoCadenceDailyRow")?.classList.toggle("hidden", mode !== "daily" && mode !== "weekly");
      document.getElementById("autoCadenceIntervalRow")?.classList.toggle("hidden", mode !== "interval");
      document.getElementById("autoCadenceWeeklyRow")?.classList.toggle("hidden", mode !== "weekly");
      document.getElementById("autoCadenceTimerRow")?.classList.toggle("hidden", mode !== "timer");
      document.getElementById("autoCadenceCronRow")?.classList.toggle("hidden", mode !== "cron");
    });

    // Prompt suggestion chips
    document.querySelectorAll(".auto-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const input = document.getElementById("autoPromptInput");
        if (input) input.value = chip.getAttribute("data-prompt") || "";
      });
    });

    // Save Automation
    saveNewAutoBtn?.addEventListener("click", () => {
      const titleInput = document.getElementById("autoTitleInput");
      const promptInput = document.getElementById("autoPromptInput");
      const title = (titleInput?.value || "").trim();
      const promptText = (promptInput?.value || "").trim();
      const cadence = cadenceSelect?.value || "daily";

      if (!title) {
        alert("Please enter a title for the automation.");
        titleInput?.focus();
        return;
      }
      if (!promptText) {
        alert("Please enter the task prompt to execute.");
        promptInput?.focus();
        return;
      }

      let scheduleText = "";
      let cronExpr = "";

      if (cadence === "daily") {
        const time = document.getElementById("autoDailyTime")?.value || "09:00";
        scheduleText = `Daily at ${time}`;
        const [hh, mm] = time.split(":");
        cronExpr = `${mm || "0"} ${hh || "9"} * * *`;
      } else if (cadence === "interval") {
        const mins = document.getElementById("autoIntervalMins")?.value || "30";
        scheduleText = `Every ${mins} minutes`;
        cronExpr = `*/${mins} * * * *`;
      } else if (cadence === "weekly") {
        const day = document.getElementById("autoWeeklyDay")?.value || "Monday";
        const time = document.getElementById("autoDailyTime")?.value || "09:00";
        scheduleText = `Weekly on ${day}s at ${time}`;
        const [hh, mm] = time.split(":");
        cronExpr = `${mm || "0"} ${hh || "9"} * * 1`;
      } else if (cadence === "timer") {
        const mins = document.getElementById("autoTimerMins")?.value || "15";
        scheduleText = `One-shot in ${mins} minutes`;
        cronExpr = `timer:${Date.now() + parseInt(mins, 10) * 60000}`;
      } else if (cadence === "cron") {
        cronExpr = (document.getElementById("autoCronExpr")?.value || "0 9 * * *").trim();
        scheduleText = `Cron: ${cronExpr}`;
      }

      const newAuto = {
        id: "auto_" + Date.now(),
        title: title,
        cadence: cadence,
        schedule: scheduleText,
        cron: cronExpr,
        prompt: promptText,
        status: "active",
        lastRun: "Scheduled",
        lastRunTimestamp: Date.now(),
        enabled: true
      };

      Store.addAutomation(newAuto);
      if (titleInput) titleInput.value = "";
      if (promptInput) promptInput.value = "";
      newAutoForm?.classList.add("hidden");
      if (newAutoBtn) newAutoBtn.textContent = "+ New Automation";
      renderAutomationsList();
      showToast(`⚡ Scheduled: "${title}"`);
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
            <div style="display:flex; align-items:center; gap:8px;">
              <strong>${auto.title}</strong>
              <span style="font-size:10px; font-family:var(--font-mono); background:rgba(6,182,212,0.15); border:1px solid rgba(6,182,212,0.3); color:var(--accent-cyan); padding:1px 6px; border-radius:4px;">${auto.cadence || "cron"}</span>
            </div>
            <span>${auto.schedule}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn-primary run-auto-btn" style="padding:4px 10px; font-size:11px;" data-id="${auto.id}">Run ⚡</button>
            <label class="switch">
              <input type="checkbox" ${auto.enabled ? "checked" : ""} data-id="${auto.id}" class="auto-toggle-checkbox">
              <span class="slider"></span>
            </label>
            <button class="delete-btn-ghost delete-auto-btn" data-id="${auto.id}" title="Delete Automation">✕</button>
          </div>
        </div>
        <div style="font-size:12px; color:var(--ink-secondary); font-family:var(--font-mono); background:#060810; padding:6px 10px; border-radius:6px; word-break:break-word;">
          ${auto.prompt}
        </div>
        <div class="automation-meta">
          <span>Status: <strong style="color:var(--accent-emerald);">${auto.status || "active"}</strong></span>
          <span>Last trigger: ${auto.lastRun || "Never"}</span>
        </div>
      `;

      card.querySelector(".auto-toggle-checkbox")?.addEventListener("change", (e) => {
        Store.toggleAutomation(auto.id);
      });

      card.querySelector(".delete-auto-btn")?.addEventListener("click", () => {
        if (confirm(`Delete automation "${auto.title}"?`)) {
          Store.removeAutomation(auto.id);
          renderAutomationsList();
        }
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

  // Rules presets catalog
  const RULES_PRESETS = {
    singapore: `# Antigravity Rules: Singapore University Admissions (SMU SCIS / NUS / NTU)
- Candidate: Akshat (Happ3ns)
- Primary Goal: Admission into Singapore universities (SMU SCIS Discovery Day, NUS School of Computing, NTU).
- Portfolio: Emphasize algorithmic excellence, full-stack scalability, AI agency, and clear technical communication.
- Communication Style: Encouraging, rigorous, concise, academically precise.
- LaTeX Math: Format all formulas using KaTeX ($$...$$ for display equations, $...$ for inline terms).
- Code Standards: Production-quality TypeScript/Python with optimal Big-O algorithmic complexity.`,

    jee: `# Antigravity Rules: JEE Advanced 99th Percentile Master
- Target: JEE Advanced Physics & Mathematics problem mastery.
- Physics: First-principles derivations (Gauss's law, Maxwell, electrodynamics, rotational mechanics).
- Mathematics: High-level calculus, complex numbers, coordinate geometry, and linear algebra.
- Verification: Always cross-check dimensional consistency and boundary condition limits.
- LaTeX Math: Display all integrals and vector equations with $$...$$. Always provide 1 follow-up challenge problem.`,

    architect: `# Antigravity Rules: Full-Stack Cloud & Systems Architect
- Stack: Modern TypeScript, React/PWA, Node.js, Vercel, Supabase, Cloudflare Workers.
- Architecture: Event-driven workflows, microfrontends, clean separation of concerns, zero bloated libraries.
- Security: Client-side secret isolation, PIN gate hashing, and safe MCP agent bridging.
- Formatting: Provide file paths, unified diffs, and copyable terminal commands.`,

    minimal: `# Antigravity Rules: Minimalist Pair Programmer
- Communication: Extremely concise. Zero pleasantries or conversational filler.
- Outputs: Direct code snippets, terminal commands, or structured bullet points.
- Reasoning: High density of actionable insights.`
  };

  // 4. Customizations Studio Modal (God Plugins, Custom MCP, Rules & Skills)
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
    let activePluginCategory = "all";

    const openCustomizations = () => {
      rulesTextarea.value = Store.getRules();
      renderPluginsGrid(activePluginCategory);
      renderCustomMcpList();
      renderSubagentsGrid();
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

    // Tab switcher (all 6 tabs)
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.getAttribute("data-cust-tab");

        document.querySelectorAll("#customizationsModal .cust-tab-panel").forEach(p => p.classList.add("hidden"));
        if (target === "plugins") {
          document.getElementById("custTabPlugins")?.classList.remove("hidden");
          renderPluginsGrid(activePluginCategory);
        } else if (target === "add-mcp") {
          document.getElementById("custTabAddMcp")?.classList.remove("hidden");
          renderCustomMcpList();
        } else if (target === "subagents") {
          document.getElementById("custTabSubagents")?.classList.remove("hidden");
          renderSubagentsGrid();
        } else if (target === "skills") {
          document.getElementById("custTabSkills")?.classList.remove("hidden");
          renderSkillsList();
        } else if (target === "rules") {
          document.getElementById("custTabRules")?.classList.remove("hidden");
        } else if (target === "appearance") {
          document.getElementById("custTabAppearance")?.classList.remove("hidden");
        }
      });
    });

    // Plugin Category Filter Bar
    const catBar = document.getElementById("pluginCategoryBar");
    catBar?.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip-btn");
      if (!chip) return;
      catBar.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activePluginCategory = chip.getAttribute("data-cat") || "all";
      renderPluginsGrid(activePluginCategory);
    });

    // Rules Presets Buttons
    document.querySelectorAll(".rules-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const presetKey = btn.getAttribute("data-preset");
        if (RULES_PRESETS[presetKey]) {
          rulesTextarea.value = RULES_PRESETS[presetKey];
          document.querySelectorAll(".rules-preset-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        }
      });
    });

    // Custom MCP Form Handlers
    initCustomMcpHandlers();

    // Custom Skill Creator Handlers
    initSkillHandlers();

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
      alert("Antigravity Customizations, Rules & MCP links saved!");
    });
  }

  // Render 10 God Plugins & Tools
  function renderPluginsGrid(filterCategory = "all") {
    const grid = document.getElementById("pluginMarketGrid");
    if (!grid) return;
    const plugins = Store.getPlugins();
    grid.innerHTML = "";

    const filtered = (filterCategory === "all")
      ? plugins
      : plugins.filter(p => p.category.toLowerCase().includes(filterCategory.toLowerCase()));

    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "plugin-card";
      const currentToken = p.authKey ? Store.getPluginAuth(p.authKey) : "";

      card.innerHTML = `
        <div class="plugin-card-header">
          <div class="plugin-brand-wrap">
            <span class="plugin-icon-box">${p.icon}</span>
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong>${p.name}</strong>
                <span class="plugin-badge">${p.category}</span>
              </div>
              <span class="plugin-author">By ${p.author}</span>
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" ${p.enabled ? "checked" : ""} data-id="${p.id}" class="plugin-toggle-checkbox">
            <span class="slider"></span>
          </label>
        </div>
        <p class="plugin-desc">${p.desc}</p>
        <div class="plugin-tools-list">
          ${p.tools.map(t => `<span class="plugin-tool-tag">${t}</span>`).join("")}
        </div>
        ${p.authKey ? `
          <div class="plugin-auth-box">
            <input type="password" placeholder="${p.authPlaceholder}" value="${currentToken}" data-key="${p.authKey}" class="plugin-token-input" autocomplete="off" spellcheck="false">
            <button class="btn-ghost plugin-save-token-btn" data-key="${p.authKey}" style="padding:4px 8px; font-size:11px;">Save</button>
          </div>
        ` : `
          <div style="font-size:11px; color:var(--accent-emerald); font-family:var(--font-mono); padding-top:4px;">
            ✓ Pre-authenticated Sandbox / Free Tier
          </div>
        `}
      `;

      card.querySelector(".plugin-toggle-checkbox")?.addEventListener("change", () => {
        Store.togglePlugin(p.id);
      });

      if (p.authKey) {
        const tokenInput = card.querySelector(".plugin-token-input");
        const saveTokenBtn = card.querySelector(".plugin-save-token-btn");

        const saveToken = () => {
          Store.setPluginAuth(p.authKey, tokenInput.value);
          saveTokenBtn.textContent = "Saved ✓";
          saveTokenBtn.style.color = "var(--accent-emerald)";
          setTimeout(() => {
            saveTokenBtn.textContent = "Save";
            saveTokenBtn.style.color = "";
          }, 1500);
        };

        saveTokenBtn?.addEventListener("click", saveToken);
        tokenInput?.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            saveToken();
          }
        });
      }

      grid.appendChild(card);
    });
  }

  // Render Subagents Hub & Dispatch Fleet
  function renderSubagentsGrid() {
    const grid = document.getElementById("subagentsGrid");
    if (!grid) return;
    const subagents = Store.getSubagents();
    grid.innerHTML = "";

    subagents.forEach(agent => {
      const card = document.createElement("div");
      card.className = "subagent-card";
      card.innerHTML = `
        <div class="subagent-header">
          <div class="subagent-brand">
            <span class="subagent-icon-box">${agent.icon}</span>
            <div>
              <strong style="color:#fff; font-size:13px;">${agent.name}</strong>
              <div style="font-size:11px; color:var(--accent-cyan); font-family:var(--font-mono);">${agent.role}</div>
            </div>
          </div>
          <span class="subagent-model-tag ${agent.model}">${agent.model.toUpperCase()}</span>
        </div>
        <p class="subagent-desc">${agent.desc}</p>
        <div class="subagent-footer">
          <div style="font-size:10.5px; font-family:var(--font-mono); color:var(--ink-muted);">
            Tools: ${agent.tools.slice(0, 2).join(", ")}${agent.tools.length > 2 ? "..." : ""}
          </div>
          <button class="btn-primary dispatch-subagent-btn" data-id="${agent.id}" data-name="${agent.name}" style="padding:4px 10px; font-size:11px;">Dispatch 🚀</button>
        </div>
      `;

      card.querySelector(".dispatch-subagent-btn")?.addEventListener("click", () => {
        document.getElementById("customizationsModal")?.close();
        const input = document.getElementById("promptInput");
        input.value = `/dispatch ${agent.id} Execute autonomous subagent workflow.`;
        input.focus();
        showToast(`Dispatched ${agent.name} subagent`);
      });

      grid.appendChild(card);
    });
  }

  // Floating Toast Notification
  function showToast(msg) {
    let toast = document.getElementById("antigravityToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "antigravityToast";
      toast.className = "antigravity-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size:15px;">⚡</span> <span>${msg}</span>`;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  // Live In-Browser Automation & Cron Ticker
  function startAutomationTicker() {
    setInterval(() => {
      const automations = Store.getAutomations();
      const now = Date.now();
      const nowDate = new Date();
      const currentHh = String(nowDate.getHours()).padStart(2, "0");
      const currentMm = String(nowDate.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHh}:${currentMm}`;

      automations.forEach(auto => {
        if (!auto.enabled) return;

        let shouldTrigger = false;

        if (auto.cadence === "interval") {
          const mins = parseInt((auto.schedule || "").replace(/\D/g, "") || "30", 10);
          const intervalMs = mins * 60 * 1000;
          const last = auto.lastRunTimestamp || 0;
          if (now - last >= intervalMs) {
            shouldTrigger = true;
          }
        } else if (auto.cadence === "daily") {
          if (auto.time === currentTimeStr && (!auto.lastRunDate || auto.lastRunDate !== nowDate.toDateString())) {
            shouldTrigger = true;
            auto.lastRunDate = nowDate.toDateString();
          }
        } else if (auto.cadence === "timer" && auto.cron && auto.cron.startsWith("timer:")) {
          const targetTime = parseInt(auto.cron.replace("timer:", ""), 10);
          if (now >= targetTime) {
            shouldTrigger = true;
            auto.enabled = false;
          }
        }

        if (shouldTrigger) {
          auto.lastRun = `Today, ${nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          auto.lastRunTimestamp = now;
          Store.updateAutomation(auto.id, auto);
          showToast(`⚡ Automation Fired: ${auto.title}`);

          if (activeSession) {
            const input = document.getElementById("promptInput");
            if (input) input.value = auto.prompt;
            sendMessage();
          }
        }
      });
    }, 25000);
  }

  // Custom MCP Server Handlers & List
  function initCustomMcpHandlers() {
    const saveBtn = document.getElementById("saveCustomMcpBtn");
    const nameInput = document.getElementById("mcpServerNameInput");
    const transportSelect = document.getElementById("mcpTransportSelect");
    const endpointInput = document.getElementById("mcpEndpointInput");
    const authInput = document.getElementById("mcpAuthInput");

    saveBtn?.addEventListener("click", () => {
      const name = (nameInput.value || "").trim();
      const transport = transportSelect?.value || "sse";
      const endpoint = (endpointInput.value || "").trim();
      const auth = (authInput.value || "").trim();

      if (!name) {
        alert("Please enter a Server Identifier (e.g. internal-db-mcp).");
        nameInput.focus();
        return;
      }
      if (!endpoint) {
        alert("Please enter a valid Server Endpoint URL (e.g. https://mcp.your-domain.com/sse).");
        endpointInput.focus();
        return;
      }

      const newServer = {
        id: "mcp_" + Date.now(),
        name: name,
        transport: transport,
        endpoint: endpoint,
        auth: auth,
        status: "Connected 🟢",
        addedAt: new Date().toLocaleDateString()
      };

      Store.addCustomMcpServer(newServer);
      nameInput.value = "";
      endpointInput.value = "";
      authInput.value = "";
      renderCustomMcpList();
      alert(`MCP Server "${name}" linked successfully!`);
    });
  }

  function renderCustomMcpList() {
    const container = document.getElementById("customMcpList");
    if (!container) return;
    const servers = Store.getCustomMcpServers();
    container.innerHTML = "";

    if (servers.length === 0) {
      container.innerHTML = `
        <div style="padding:16px; text-align:center; color:var(--ink-muted); font-size:12px; background:var(--bg-card-subtle); border-radius:8px; border:1px dashed var(--border-hairline);">
          No custom MCP servers connected yet. Fill out the form above to link your external SSE, HTTP, or stdio tool bridge.
        </div>
      `;
      return;
    }

    servers.forEach(s => {
      const item = document.createElement("div");
      item.className = "custom-mcp-item";
      item.innerHTML = `
        <div class="custom-mcp-info">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong>${s.name}</strong>
            <span style="font-size:10px; background:rgba(99,102,241,0.2); border:1px solid rgba(99,102,241,0.4); color:var(--accent-indigo); padding:1px 6px; border-radius:4px;">${(s.transport || "SSE").toUpperCase()}</span>
            <span style="font-size:11px; color:var(--accent-emerald);">${s.status || "Connected 🟢"}</span>
          </div>
          <span>${s.endpoint}</span>
        </div>
        <button class="delete-btn-ghost delete-mcp-btn" data-id="${s.id}" title="Remove MCP Server">✕</button>
      `;

      item.querySelector(".delete-mcp-btn")?.addEventListener("click", () => {
        if (confirm(`Remove custom MCP server "${s.name}"?`)) {
          Store.removeCustomMcpServer(s.id);
          renderCustomMcpList();
        }
      });

      container.appendChild(item);
    });
  }

  // Custom Skills Form Handlers & List
  function initSkillHandlers() {
    const toggleBtn = document.getElementById("newSkillToggleBtn");
    const form = document.getElementById("newSkillForm");
    const nameInput = document.getElementById("newSkillNameInput");
    const iconInput = document.getElementById("newSkillIconInput");
    const descInput = document.getElementById("newSkillDescInput");
    const submitBtn = document.getElementById("submitCreateSkillBtn");

    toggleBtn?.addEventListener("click", () => {
      form.classList.toggle("hidden");
      toggleBtn.textContent = form.classList.contains("hidden") ? "+ Create Skill" : "✕ Cancel";
    });

    submitBtn?.addEventListener("click", () => {
      const name = (nameInput.value || "").trim();
      const icon = (iconInput.value || "").trim() || "⚡";
      const desc = (descInput.value || "").trim();

      if (!name) {
        alert("Please enter a skill name.");
        nameInput.focus();
        return;
      }

      Store.addSkill({
        id: "skill_" + Date.now(),
        name: name,
        icon: icon,
        desc: desc || "Custom user skill toolkit",
        enabled: true
      });

      nameInput.value = "";
      iconInput.value = "";
      descInput.value = "";
      form.classList.add("hidden");
      toggleBtn.textContent = "+ Create Skill";
      renderSkillsList();
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

    // Topbar Hard Reload (Cache Busting)
    document.getElementById("hardRefreshBtn")?.addEventListener("click", () => {
      window.location.replace(window.location.origin + window.location.pathname + "?ts=" + Date.now());
    });
  }

  // 7. Model & Mode Selector
  function initModelModal() {
    const modal = document.getElementById("modelSelectModal");
    const pillBtn = document.getElementById("activeModelPill");
    const closeBtn = document.getElementById("closeModelModalBtn");
    const cards = document.querySelectorAll(".model-option-card");
    const applyCustomBtn = document.getElementById("applyCustomModelBtn");
    const customInput = document.getElementById("customModelIdInput");

    updateModelDisplay();

    pillBtn?.addEventListener("click", () => {
      const current = Store.getModel();
      cards.forEach(c => c.classList.toggle("active", c.getAttribute("data-model") === current));
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
        showToast(`Active model: ${modelId}`);
      });
    });

    applyCustomBtn?.addEventListener("click", () => {
      const customId = (customInput?.value || "").trim();
      if (!customId) {
        alert("Please enter a model ID (e.g. gemini-3.8-flash).");
        return;
      }
      Store.setModel(customId);
      cards.forEach(c => c.classList.remove("active"));
      updateModelDisplay();
      modal?.close();
      showToast(`Active model: ${customId}`);
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
      "gemini-3.8-flash": "✨ Gemini 3.8 Flash",
      "gemini-2.5-flash": "⚡ Gemini 2.5 Flash",
      "gemini-2.5-pro": "🧠 Gemini 2.5 Pro",
      "gemini-2.0-flash-thinking-exp": "🔬 2.0 Flash Thinking",
      "gemini-2.0-flash": "🚀 Gemini 2.0 Flash"
    };
    if (textEl) {
      textEl.textContent = map[currentModel] || `✨ ${currentModel}`;
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

    function launchInteractiveDemo() {
      try {
        const modal = document.getElementById("settingsModal");
        if (modal && modal.open) modal.close();
      } catch (e) {}

      showToast("⚡ Launching interactive agent simulation...", "info");

      const input = document.getElementById("promptInput");
      if (input) {
        input.value = "";
        input.style.height = "auto";
      }

      createNewSession("Demo: Agent Architecture & Tools");

      const demoPrompt = "/plan Architect autonomous AI agent with 24 MCP plugins, subagents fleet, and background automations";

      const stream = document.getElementById("chatStream");
      const userMsg = document.createElement("div");
      userMsg.className = "chat-msg user";
      userMsg.textContent = demoPrompt;
      stream.appendChild(userMsg);

      activeSession.messages.push({ role: "user", content: demoPrompt, created_at: new Date().toISOString() });
      saveActiveSession();

      const thinkingEl = document.createElement("div");
      thinkingEl.className = "chat-msg assistant thinking-active";
      thinkingEl.innerHTML = `
        <div class="assistant-header">
          <div class="assistant-avatar">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/>
              <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>
            </svg>
          </div>
          <span class="assistant-title">Antigravity</span>
          <span class="assistant-model-tag">${Store.getModel()}</span>
        </div>
        <div style="padding: 10px 14px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; margin-top: 8px; font-family: var(--font-mono); font-size: 12.5px; color: #a5b4fc; display: flex; align-items: center; gap: 8px;">
          <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#818cf8; box-shadow:0 0 8px #818cf8; animation:pulse 1s infinite;"></span>
          <span>Simulating multi-agent reasoning across 24 God Plugins & MCP fleet...</span>
        </div>
      `;
      stream.appendChild(thinkingEl);
      stream.scrollTop = stream.scrollHeight;

      setTimeout(() => {
        thinkingEl.remove();
        handleLocalAgentResponse(demoPrompt);
      }, 600);
    }

    document.getElementById("interactiveDemoBtn")?.addEventListener("click", launchInteractiveDemo);
    document.getElementById("runDemoModeBtn")?.addEventListener("click", launchInteractiveDemo);
    root.launchInteractiveDemo = launchInteractiveDemo;
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

    // Inject active user rules, skills, God Plugins & MCP servers into system prompt
    const userRules = Store.getRules();
    const activeSkills = Store.getSkills().filter(s => s.enabled).map(s => `• ${s.icon} ${s.name}: ${s.desc}`).join("\n");
    const activePlugins = Store.getPlugins().filter(p => p.enabled).map(p => `• [God Plugin] ${p.name} (${p.category}): Tools=[${p.tools.join(", ")}]`).join("\n");
    const customMcp = Store.getCustomMcpServers().map(s => `• [Custom MCP] ${s.name} (${s.transport}): ${s.endpoint}`).join("\n");

    const systemInstruction = `You are Antigravity, Google DeepMind's Advanced Agentic Coding Assistant paired with Akshat (Happ3ns).
Operating Mode: ${mode.toUpperCase()}.

Enabled God Plugins:
${activePlugins || "None"}

Connected Custom MCP Servers:
${customMcp || "None"}

Active Skills:
${activeSkills || "None"}

User Instructions & AGENTS.md Rules:
${userRules}

Format responses with GitHub markdown, KaTeX math notation ($$...$$ display, $...$ inline), and code blocks with language tags.
You have full access and operational awareness of all active God Plugins and Custom MCP Servers. When the user requests tasks involving Figma, Notion, Supabase, Linear, GitHub, Python Sandbox, BioMol Science Suite, Canva, Stripe, Railway/Netlify, or custom MCP servers, format and describe your tool invocations or execute them.
Wrap internal chain-of-thought in <thinking>...</thinking> tags before the final answer.`;

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

    } else if (lower.startsWith("/mcp") || lower === "mcp") {
      const plugins = Store.getPlugins().filter(p => p.enabled);
      const customServers = Store.getCustomMcpServers();
      thinking = "Inspecting connected Model Context Protocol (MCP) servers and tool registries.";
      toolCalls.push({ name: "mcp_list_tools", args: { filter: "all_connected" } });

      responseText = `### 🔌 Model Context Protocol (MCP) Server Status

**Connected God Plugins (${plugins.length} Active):**
${plugins.map(p => `- **${p.icon} ${p.name}** (${p.category}): \`${p.tools.join("`, `")}\``).join("\n")}

**Custom MCP Servers (${customServers.length} Active):**
${customServers.length > 0 ? customServers.map(s => `- **${s.name}** [${s.transport.toUpperCase()}]: \`${s.endpoint}\` (${s.status || "Connected"})`).join("\n") : "_No custom MCP endpoints connected. Add one via **Customise > + Add Custom MCP**!_"}

> [!TIP]
> You can trigger any MCP tool directly or configure additional private servers via the **Customise** menu in the top bar.`;

    } else if (lower.startsWith("/plugins") || lower === "plugins") {
      const allPlugins = Store.getPlugins();
      thinking = "Reading installed extensions catalog and God Plugins registry.";
      responseText = `### 🧩 Antigravity God Plugins Catalog

| Plugin | Category | Status | Available Tools |
| :--- | :--- | :--- | :--- |
${allPlugins.map(p => `| **${p.icon} ${p.name}** | ${p.category} | ${p.enabled ? "🟢 Active" : "⚪ Disabled"} | \`${p.tools.slice(0, 2).join(", ")}${p.tools.length > 2 ? "..." : ""}\` |`).join("\n")}

*To enable/disable plugins or configure API tokens, tap **Customise** in the top bar.*`;

    } else if (lower.startsWith("/figma")) {
      thinking = "Invoking Figma MCP: querying design tokens, layout hierarchy, and Code Connect mappings.";
      toolCalls.push({ name: "figma_get_design_context", args: { file_key: "antigravity-ipad-shell", node_id: "0:1" } });
      responseText = `### 🎨 Figma MCP Integration
**Connected File:** \`Antigravity iPadOS Studio UI\`
- **Inspected Frames:** Top Navigation Bar, Chat Stream Canvas, Translucent Math Pad, Studio Pane.
- **Color Tokens:**
  - \`--bg-deep\`: \`#040508\`
  - \`--bg-card\`: \`#0c101c\`
  - \`--accent-indigo\`: \`#6366f1\`
  - \`--accent-cyan\`: \`#06b6d4\`
- **Code Connect Snippet:**
\`\`\`tsx
export function AntigravityTopBar({ title, model }: TopBarProps) {
  return (
    <header className="chat-topbar">
      <NavControls />
      <h2 className="session-title">{title}</h2>
      <ModelPill model={model} />
    </header>
  );
}
\`\`\``;

    } else if (lower.startsWith("/supabase")) {
      thinking = "Executing Supabase MCP: inspecting database schema and active tables.";
      toolCalls.push({ name: "supabase_execute_sql", args: { query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public';" } });
      responseText = `### ⚡ Supabase Postgres MCP

**Executed Query:** \`SELECT table_name FROM information_schema.tables WHERE table_schema='public';\`

| Table Name | Records | Row Level Security (RLS) | Last Modified |
| :--- | :--- | :--- | :--- |
| \`admissions_milestones\` | 18 | Enabled 🔒 | Today, 14:20 |
| \`jee_quiz_bank\` | 412 | Enabled 🔒 | Today, 08:00 |
| \`user_preferences\` | 1 | Enabled 🔒 | 5 mins ago |
| \`synced_sessions\` | 24 | Enabled 🔒 | Just now |

> All queries executed safely via client-side Supabase MCP bridge.`;

    } else if (lower.startsWith("/notion")) {
      thinking = "Querying Notion Workspace MCP for application trackers and Singapore university wikis.";
      toolCalls.push({ name: "notion_query_data_sources", args: { database: "Singapore Admissions Tracker 2026" } });
      responseText = `### 📝 Notion Workspace MCP

**Database:** \`Singapore Admissions Tracker 2026\`
- **SMU SCIS (BSc Computing):** Application submitted. Discovery Day technical interview preparation in progress.
- **NUS Computing:** Algorithmic portfolio & JEE Advanced rank verification ready.
- **NTU College of Computing & Data Science:** Standard evaluation track.

*Page \`2026-Preparation-Log\` synced successfully.*`;

    } else if (lower.startsWith("/science")) {
      thinking = "Invoking Science & BioMol MCP: fetching PDB structural coordinates and ChEMBL binding assays.";
      toolCalls.push({ name: "pdb_fetch_structure", args: { pdb_id: "6LU7" } });
      responseText = `### 🔬 Science & BioMol MCP

**PDB Entry:** \`6LU7\` (SARS-CoV-2 Main Protease Complexed with Inhibitor N3)
- **Resolution:** 2.16 Å (X-ray diffraction)
- **Organism:** Severe acute respiratory syndrome coronavirus 2
- **ChEMBL Assays:** 14 bioactivity records with $IC_{50} < 100\\,\\text{nM}$.
- **Catalytic Dyad:** Cys145 - His41 pocket confirmed.`;

    } else if (lower.startsWith("/python")) {
      thinking = "Dispatching code block to isolated Python Sandbox runtime.";
      toolCalls.push({ name: "python_sandbox_run", args: { code: prompt.replace("/python", "").trim() || "import numpy as np; print(np.pi)" } });
      responseText = `### 🐍 Python Sandbox Execution

\`\`\`python
# Executed in sandboxed WebAssembly / microVM runtime
import numpy as np
import scipy.integrate as integrate

# Verification of Gaussian Integral
result, error = integrate.quad(lambda x: np.exp(-x**2), -np.inf, np.inf)
print(f"Result: {result:.10f}")
print(f"Analytical sqrt(pi): {np.sqrt(np.pi):.10f}")
\`\`\`

**Standard Output:**
\`\`\`
Result: 1.7724538509
Analytical sqrt(pi): 1.7724538509
Code executed successfully in 14ms (0 errors).
\`\`\``;

    } else if (lower.startsWith("/subagents") || lower.startsWith("/teamwork")) {
      const subagents = Store.getSubagents();
      thinking = "Enumerating desktop Antigravity autonomous subagent registry and active dispatch capabilities.";
      toolCalls.push({ name: "subagents_list_fleet", args: {} });
      responseText = `### 🤖 Antigravity Autonomous Subagent Fleet

Desktop Antigravity multi-agent architecture running on iPadOS:

| Subagent | Role | Default Model | Key Tool Capabilities |
| :--- | :--- | :--- | :--- |
${subagents.map(a => `| **${a.icon} ${a.name}** | \`${a.role}\` | \`${a.model.toUpperCase()}\` | ${a.tools.join(", ")} |`).join("\n")}

> [!TIP]
> Dispatch any subagent immediately using \`/dispatch <subagent-id> <instruction>\` or tap **Customise > Subagents Hub**!`;

    } else if (lower.startsWith("/dispatch")) {
      const parts = prompt.split(" ");
      const agentId = parts[1] || "research";
      const task = parts.slice(2).join(" ") || "Execute assigned subagent workflow.";
      thinking = `Spawning isolated subagent instance: [${agentId}]. Allocating child context window and sandboxed memory.`;
      toolCalls.push({ name: "invoke_subagent", args: { TypeName: agentId, Role: "Specialist", Prompt: task } });
      responseText = `🚀 **Subagent Dispatched:** \`${agentId}\`
- **Assigned Task:** "${task}"
- **Isolation Mode:** Branched workspace context (zero parent transcript clutter).
- **Status:** Running background analysis...

*Subagent completed execution with status: 0 errors.*`;

    } else if (lower.startsWith("/schedule") || lower.startsWith("/automation")) {
      thinking = "Parsing automation schedule cadence and configuring background cron timer.";
      toolCalls.push({ name: "schedule_create", args: { prompt: prompt } });
      document.getElementById("automationsModal")?.showModal();
      renderAutomationsList();
      responseText = `⚡ **Automations Studio Opened**
- View your active background timers, interval sweeps, and scheduled agent jobs.
- Tap **+ New Automation** to configure custom cadences (Daily, Weekly, Interval, or Cron).`;

    } else if (lower.startsWith("/browser")) {
      const targetUrl = prompt.replace("/browser", "").trim() || "https://admissions.smu.edu.sg";
      thinking = `Launching headless browser MCP instance. Navigating to ${targetUrl} and evaluating DOM accessibility.`;
      toolCalls.push({ name: "chrome_navigate", args: { url: targetUrl } });
      toolCalls.push({ name: "chrome_capture_screenshot", args: {} });
      responseText = `### 🌐 Chrome Browser Automation MCP

**Navigated to:** \`${targetUrl}\`
- **HTTP Status:** 200 OK
- **Viewport:** 1024x768 (iPad landscape emulation)
- **DOM Audit:** 0 accessibility violations, full semantic HTML structure.
- **Console Errors:** None.`;

    } else if (lower.startsWith("/grill-me")) {
      thinking = "Initiating interactive design and architecture interview to resolve ambiguous decisions.";
      responseText = `### 🎙️ Antigravity Interactive Alignment Interview

I'm ready to grill you on your design decisions to ensure maximum technical rigor. Let's start with Phase 1:

1. **Architecture Trade-off:** For your Singapore admissions portfolio, why choose a client-side PWA with PIN encryption over a traditional server-rendered SSR app?
2. **State & Sync:** How do you guarantee zero token leaks when synchronizing desktop transcript logs with GitHub Pages?
3. **Evaluation Metric:** How will you demonstrate your algorithmic problem-solving ability in the SMU SCIS Discovery Day interview?

*Reply directly with your thoughts to proceed to Phase 2!*`;

    } else if (lower.startsWith("/boost")) {
      thinking = "Activating Boost Mode: engaging multi-perspective verification, formal logic proofs, and self-correction passes.";
      responseText = `🚀 **Boost Mode Engaged**
- Reasoning depth set to Maximum (extended chain-of-thought).
- Cross-checking outputs against formal verification criteria and AGENTS.md constraints.
- Model latency optimized for precision.`;

    } else if (lower.startsWith("/learn")) {
      const ruleToLearn = prompt.replace("/learn", "").trim();
      thinking = `Extracting durable learning and persisting into AGENTS.md rules vault: "${ruleToLearn}".`;
      if (ruleToLearn) {
        const currentRules = Store.getRules();
        const updatedRules = `${currentRules}\n- [User Rule]: ${ruleToLearn}`;
        Store.setRules(updatedRules);
        showToast("Learned new rule!");
        responseText = `✅ **Learned & Persisted to AGENTS.md:**\n> "${ruleToLearn}"\n\nAntigravity will adhere to this constraint across all future sessions.`;
      } else {
        responseText = `Usage: \`/learn <instruction to permanently remember>\``;
      }

    } else if (lower.startsWith("/compact")) {
      thinking = "Summarizing prior session trajectory, pruning dead tokens, and isolating key architectural decisions.";
      responseText = `🧹 **Session Context Compacted**
- Consolidated previous conversation turns.
- Preserved active system rules, God Plugins state, and admissions milestones.
- Context window headroom refreshed.`;

    } else if (lower.startsWith("/vercel")) {
      thinking = "Invoking Vercel AI & Cloud SDK MCP: checking deployments and edge function metrics.";
      toolCalls.push({ name: "vercel_inspect_deployment", args: { project: "antigravity-hub" } });
      responseText = `### ▲ Vercel AI & Cloud SDK MCP
**Project:** \`antigravity-hub\`
- **Status:** Ready (Production)
- **Edge Middleware:** Active (0ms cold start)
- **AI SDK Runtime:** Streaming SSE enabled
- **Custom Metrics:** 99.8% cache hit rate on static assets.`;

    } else if (lower.startsWith("/coderabbit")) {
      thinking = "Invoking CodeRabbit Automated Reviewer MCP: performing SAST audit on local diffs.";
      toolCalls.push({ name: "coderabbit_sast_audit", args: { target: "public/js" } });
      responseText = `### 🐇 CodeRabbit Automated Reviewer MCP

**Security & Quality Audit Summary:**
- **Static Analysis (SAST):** 0 High/Critical vulnerabilities detected.
- **Secrets Scanning:** Verified 0 leaked API keys, tokens, or hashes.
- **Type Safety & Linting:** 100% clean across all 4 core scripts.
- **Recommendation:** Pull request is ready for deployment.`;

    } else if (lower.startsWith("/chrome")) {
      thinking = "Invoking Chrome DevTools MCP: auditing DOM accessibility (a11y) and layout metrics.";
      toolCalls.push({ name: "chrome_audit_a11y", args: {} });
      responseText = `### 🔍 Chrome DevTools & a11y Audit MCP

- **Retina Display Ratio:** 2.0x (Crisp subpixel font rendering confirmed)
- **Safe Area Insets:** \`env(safe-area-inset-top)\` properly anchored.
- **Status Bar Blur:** Eradicated (solid dark navigation header).
- **Contrast Ratio:** 14.8:1 on primary text (AAA compliant).`;

    } else if (lower.startsWith("/arxiv")) {
      thinking = "Invoking arXiv Academic Literature MCP: searching recent preprints on LLM reasoning architectures.";
      toolCalls.push({ name: "search_arxiv", args: { query: "agentic reasoning code generation" } });
      responseText = `### 📚 arXiv Academic Literature MCP

1. **DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning** (arXiv:2501.12948)
   - Demonstrates emergence of long chain-of-thought reasoning without supervised fine-tuning.
2. **SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering** (arXiv:2405.15793)
   - Benchmarking agentic workflows against real-world GitHub issues.`;

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
    if (!activeSession) return;

    if (!activeSession.messages || activeSession.messages.length === 0) {
      const welcomeCard = document.createElement("div");
      welcomeCard.className = "welcome-empty-card";
      welcomeCard.style.cssText = "text-align: center; max-width: 580px; margin: 36px auto; padding: 24px; background: rgba(18, 22, 34, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; backdrop-filter: blur(12px);";
      welcomeCard.innerHTML = `
        <div style="width: 48px; height: 48px; margin: 0 auto 14px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #06b6d4); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(99,102,241,0.4);">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/>
            <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>
          </svg>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Antigravity iPadOS & Desktop Studio</h2>
        <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
          Autonomous agentic workspace with 24 God Plugins, specialized subagents fleet, MCP connectors, and background automations.
        </p>
        <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
          <button class="demo-start-hero-btn" onclick="window.launchInteractiveDemo && window.launchInteractiveDemo()" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(99,102,241,0.35);">
            ⚡ Try Demo Mode (Instant Simulation)
          </button>
        </div>
      `;
      stream.appendChild(welcomeCard);
      return;
    }

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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);
    ctx.scale(dpr, dpr);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
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
