// ── Antigravity Studio Client State, MCP Marketplace, Automations & Rules Engine ──
(function (root) {
  "use strict";

  const STORAGE_KEYS = {
    PIN: "ag_pin_hash",
    IS_UNLOCKED: "ag_unlocked",
    GEMINI_KEY: "ag_gemini_key",
    GITHUB_TOKEN: "ag_github_token",
    MODEL: "ag_active_model",
    MODE: "ag_active_mode",
    WEB_SEARCH: "ag_web_search",
    COT: "ag_cot_enabled",
    SESSIONS: "ag_sessions_cache",
    ACTIVE_SESSION_ID: "ag_active_session_id",
    RULES: "ag_custom_rules",
    SKILLS: "ag_active_skills",
    PLUGINS: "ag_installed_plugins",
    CUSTOM_MCP: "ag_custom_mcp_servers",
    AUTOMATIONS: "ag_automations_list",
    KB_TRANSPARENCY: "ag_kb_transparency",
    THEME_ACCENT: "ag_theme_accent"
  };

  const DEFAULT_PIN = "1234";

  const DEFAULT_RULES = `# Antigravity System Rules (AGENTS.md)
- User: Akshat (Happ3ns)
- Focus: Undergraduate admissions in Singapore (SMU SCIS, NUS, NTU) & high-yield JEE Advanced mastery.
- Mathematics: Always render equations with LaTeX KaTeX notation ($$...$$ for display, $...$ for inline).
- Code Quality: Provide production-grade, modular code with clear comments and copyable snippets.
- Execution: Wrap deep reasoning traces in <thinking>...</thinking> tags.
- Tools: Always check enabled MCP servers and invoke appropriate tool calls before answering.`;

  const DEFAULT_PLUGINS = [
    {
      id: "figma",
      name: "Figma & FigJam MCP",
      icon: "🎨",
      category: "Design",
      author: "Figma Official",
      desc: "Inspect frames, read component variants, generate Code Connect snippets, and export SVGs.",
      authPlaceholder: "figd_...",
      authKey: "ag_figma_token",
      enabled: true,
      tools: ["get_design_context", "generate_diagram", "get_code_connect_map", "export_svg"]
    },
    {
      id: "notion",
      name: "Notion Workspace MCP",
      icon: "📝",
      category: "Productivity",
      author: "Notion Labs",
      desc: "Search workspace wikis, query meeting databases, create tracker pages, and sync durable notes.",
      authPlaceholder: "secret_...",
      authKey: "ag_notion_token",
      enabled: true,
      tools: ["notion_search", "notion_create_pages", "notion_query_data_sources", "notion_fetch"]
    },
    {
      id: "supabase",
      name: "Supabase Postgres MCP",
      icon: "⚡",
      category: "Backend",
      author: "Supabase",
      desc: "Execute SQL queries, inspect table structures, manage migrations, and generate TypeScript types.",
      authPlaceholder: "https://xyz.supabase.co + Service Key",
      authKey: "ag_supabase_token",
      enabled: true,
      tools: ["execute_sql", "list_tables", "list_migrations", "query_logs"]
    },
    {
      id: "linear",
      name: "Linear Issue Tracker MCP",
      icon: "🎯",
      category: "Productivity",
      author: "Linear",
      desc: "Create and triage bug reports, assign sprint cycles, manage team milestones, and audit diffs.",
      authPlaceholder: "lin_api_...",
      authKey: "ag_linear_token",
      enabled: true,
      tools: ["list_issues", "save_issue", "list_cycles", "get_project"]
    },
    {
      id: "github-mcp",
      name: "GitHub Developer MCP",
      icon: "🐙",
      category: "Developer Tools",
      author: "GitHub",
      desc: "Full repository access: inspect file trees, review commits, create pull requests, and commit code.",
      authPlaceholder: "ghp_...",
      authKey: "ag_github_token",
      enabled: true,
      tools: ["get_file", "create_commit", "list_repos", "read_tree"]
    },
    {
      id: "python-sandbox",
      name: "Python Sandbox & Runtime MCP",
      icon: "🐍",
      category: "Developer Tools",
      author: "Antigravity Core",
      desc: "Run Python scripts, execute mathematical simulations, and manipulate data frames securely.",
      authPlaceholder: "Built-in Sandbox (No key required)",
      authKey: "",
      enabled: true,
      tools: ["run_python", "run_command", "evaluate_math"]
    },
    {
      id: "science-suite",
      name: "Science & BioMol MCP",
      icon: "🔬",
      category: "Research",
      author: "DeepMind Science",
      desc: "Query PDB 3D macromolecular structures, ChEMBL bioactivity assays, and PubChem compounds.",
      authPlaceholder: "Public Open Access",
      authKey: "",
      enabled: true,
      tools: ["pdb_database", "chembl_database", "pubchem_search"]
    },
    {
      id: "canva",
      name: "Canva Design Studio MCP",
      icon: "✨",
      category: "Design",
      author: "Canva",
      desc: "Create presentation slides, social media graphics, remove photo backgrounds, and export assets.",
      authPlaceholder: "Canva Connect API Key",
      authKey: "ag_canva_token",
      enabled: false,
      tools: ["create_design", "generate_image", "export_design"]
    },
    {
      id: "stripe",
      name: "Stripe Payments & Billing MCP",
      icon: "💳",
      category: "Business",
      author: "Stripe",
      desc: "Query customer accounts, generate payment checkout links, inspect invoices, and track revenue.",
      authPlaceholder: "sk_test_...",
      authKey: "ag_stripe_token",
      enabled: false,
      tools: ["stripe_api_read", "create_invoice", "customer_search"]
    },
    {
      id: "railway-netlify",
      name: "Cloud Hosting & Deploy MCP",
      icon: "☁️",
      category: "Cloud",
      author: "Railway & Netlify",
      desc: "Deploy edge functions, manage background services, inspect build logs, and bind domains.",
      authPlaceholder: "Railway / Netlify Token",
      authKey: "ag_cloud_token",
      enabled: true,
      tools: ["create_deployment", "get_service_logs", "list_domains"]
    }
  ];

  const DEFAULT_SKILLS = [
    { id: "jee-tutor", name: "JEE Advanced Tutor", desc: "Physics & Mathematics problem generator with step-by-step calculus proofs.", enabled: true, icon: "🧪" },
    { id: "singapore-admissions", name: "Singapore Uni Admissions", desc: "SMU SCIS Discovery Day & NUS Computing portfolio optimization.", enabled: true, icon: "🏛️" },
    { id: "code-reviewer", name: "Code Reviewer & SAST Auditor", desc: "Automated security audits, type safety, and algorithmic complexity checks.", enabled: true, icon: "💻" },
    { id: "spec-architect", name: "System Spec Architect", desc: "Generates multi-stage architecture specs and markdown artifacts.", enabled: true, icon: "📝" },
    { id: "browser-agent", name: "Web & arXiv Researcher", desc: "Searches arXiv preprints, technical RFCs, and documentation.", enabled: true, icon: "🔍" },
    { id: "math-solver", name: "KaTeX Mathematical Prover", desc: "Solves differential equations, electrodynamics integrals, and algebra.", enabled: true, icon: "📐" }
  ];

  const DEFAULT_AUTOMATIONS = [
    {
      id: "auto-jee",
      title: "Daily JEE Practice Problem",
      schedule: "Every morning at 08:00 AM",
      prompt: "/quiz Generate a challenging JEE Advanced calculus or electrodynamics problem with step-by-step proof.",
      status: "active",
      lastRun: "Today, 08:00 AM",
      enabled: true
    },
    {
      id: "auto-sync",
      title: "PC Brain & Transcripts Auto-Sync",
      schedule: "Every 30 minutes",
      prompt: "/sync",
      status: "active",
      lastRun: "10 mins ago",
      enabled: true
    },
    {
      id: "auto-admissions",
      title: "Singapore Admissions Profile Audit",
      schedule: "Weekly on Mondays at 09:00 AM",
      prompt: "Audit my current GitHub portfolio and prepare SMU SCIS & NUS interview talking points.",
      status: "scheduled",
      lastRun: "3 days ago",
      enabled: true
    },
    {
      id: "auto-repo",
      title: "GitHub Repo Health Watcher",
      schedule: "Every 2 hours",
      prompt: "Check Happ3ns/JEE-Quiz-Generator for commit status, build issues, and suggest optimizations.",
      status: "active",
      lastRun: "45 mins ago",
      enabled: true
    },
    {
      id: "auto-news",
      title: "Daily arXiv AI Research Sweep",
      schedule: "Daily at 10:00 AM",
      prompt: "/search Latest breakthrough papers on LLM agentic reasoning and code synthesis.",
      status: "scheduled",
      lastRun: "Yesterday",
      enabled: false
    }
  ];

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString();
  }

  const Store = {
    isLocked: function () {
      return sessionStorage.getItem(STORAGE_KEYS.IS_UNLOCKED) !== "true";
    },

    unlockWithPin: function (inputPin) {
      const storedHash = localStorage.getItem(STORAGE_KEYS.PIN) || hash(DEFAULT_PIN);
      if (hash(inputPin) === storedHash) {
        sessionStorage.setItem(STORAGE_KEYS.IS_UNLOCKED, "true");
        return true;
      }
      return false;
    },

    setNewPin: function (newPin) {
      if (newPin && newPin.length === 4) {
        localStorage.setItem(STORAGE_KEYS.PIN, hash(newPin));
        return true;
      }
      return false;
    },

    lock: function () {
      sessionStorage.removeItem(STORAGE_KEYS.IS_UNLOCKED);
    },

    getApiKey: function () {
      return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || "";
    },

    setApiKey: function (key) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, (key || "").trim());
    },

    getGithubToken: function () {
      return localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN) || "";
    },

    setGithubToken: function (token) {
      localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, (token || "").trim());
    },

    getModel: function () {
      return localStorage.getItem(STORAGE_KEYS.MODEL) || "gemini-2.5-flash";
    },

    setModel: function (m) {
      localStorage.setItem(STORAGE_KEYS.MODEL, m);
    },

    getMode: function () {
      return localStorage.getItem(STORAGE_KEYS.MODE) || "agentic";
    },

    setMode: function (m) {
      localStorage.setItem(STORAGE_KEYS.MODE, m);
    },

    isWebSearchEnabled: function () {
      const val = localStorage.getItem(STORAGE_KEYS.WEB_SEARCH);
      return val === null ? true : val === "true";
    },

    setWebSearchEnabled: function (enabled) {
      localStorage.setItem(STORAGE_KEYS.WEB_SEARCH, enabled ? "true" : "false");
    },

    isCotEnabled: function () {
      const val = localStorage.getItem(STORAGE_KEYS.COT);
      return val === null ? true : val === "true";
    },

    setCotEnabled: function (enabled) {
      localStorage.setItem(STORAGE_KEYS.COT, enabled ? "true" : "false");
    },

    getSessions: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    saveSessions: function (sessions) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    },

    getActiveSessionId: function () {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID) || null;
    },

    setActiveSessionId: function (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, id);
    },

    // ── Rules (AGENTS.md) ──
    getRules: function () {
      return localStorage.getItem(STORAGE_KEYS.RULES) || DEFAULT_RULES;
    },

    setRules: function (rules) {
      localStorage.setItem(STORAGE_KEYS.RULES, rules);
    },

    // ── Skills Directory ──
    getSkills: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SKILLS);
        return raw ? JSON.parse(raw) : DEFAULT_SKILLS;
      } catch (e) {
        return DEFAULT_SKILLS;
      }
    },

    setSkills: function (skills) {
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
    },

    toggleSkill: function (id) {
      const skills = this.getSkills();
      const s = skills.find(item => item.id === id);
      if (s) {
        s.enabled = !s.enabled;
        this.setSkills(skills);
      }
    },

    addSkill: function (skill) {
      const skills = this.getSkills();
      skills.push(skill);
      this.setSkills(skills);
    },

    // ── Plugins & MCP Marketplace ──
    getPlugins: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PLUGINS);
        return raw ? JSON.parse(raw) : DEFAULT_PLUGINS;
      } catch (e) {
        return DEFAULT_PLUGINS;
      }
    },

    setPlugins: function (plugins) {
      localStorage.setItem(STORAGE_KEYS.PLUGINS, JSON.stringify(plugins));
    },

    togglePlugin: function (id) {
      const plugins = this.getPlugins();
      const p = plugins.find(item => item.id === id);
      if (p) {
        p.enabled = !p.enabled;
        this.setPlugins(plugins);
      }
    },

    getPluginAuth: function (key) {
      return key ? localStorage.getItem(key) || "" : "";
    },

    setPluginAuth: function (key, val) {
      if (key) localStorage.setItem(key, (val || "").trim());
    },

    // ── Custom MCP Servers ──
    getCustomMcpServers: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_MCP);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    setCustomMcpServers: function (list) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_MCP, JSON.stringify(list));
    },

    addCustomMcpServer: function (server) {
      const list = this.getCustomMcpServers();
      list.push(server);
      this.setCustomMcpServers(list);
    },

    removeCustomMcpServer: function (id) {
      const list = this.getCustomMcpServers().filter(s => s.id !== id);
      this.setCustomMcpServers(list);
    },

    // ── Automations & Cron Tasks ──
    getAutomations: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS);
        return raw ? JSON.parse(raw) : DEFAULT_AUTOMATIONS;
      } catch (e) {
        return DEFAULT_AUTOMATIONS;
      }
    },

    setAutomations: function (autos) {
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(autos));
    },

    addAutomation: function (auto) {
      const list = this.getAutomations();
      list.push(auto);
      this.setAutomations(list);
    },

    toggleAutomation: function (id) {
      const list = this.getAutomations();
      const a = list.find(item => item.id === id);
      if (a) {
        a.enabled = !a.enabled;
        this.setAutomations(list);
      }
    },

    removeAutomation: function (id) {
      const list = this.getAutomations().filter(a => a.id !== id);
      this.setAutomations(list);
    },

    // ── Keyboard & Appearance ──
    getKeyboardTransparency: function () {
      return parseInt(localStorage.getItem(STORAGE_KEYS.KB_TRANSPARENCY) || "45", 10);
    },

    setKeyboardTransparency: function (val) {
      localStorage.setItem(STORAGE_KEYS.KB_TRANSPARENCY, val.toString());
    },

    getThemeAccent: function () {
      return localStorage.getItem(STORAGE_KEYS.THEME_ACCENT) || "indigo";
    },

    setThemeAccent: function (val) {
      localStorage.setItem(STORAGE_KEYS.THEME_ACCENT, val);
    }
  };

  root.Store = Store;

})(typeof window !== "undefined" ? window : globalThis);
