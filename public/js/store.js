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
      name: "DeepMind Science & BioMol MCP",
      icon: "🔬",
      category: "Research",
      author: "DeepMind Science",
      desc: "Query PDB 3D macromolecular structures, AlphaFold models, ChEMBL assays, and PubChem compounds.",
      authPlaceholder: "Public Open Access",
      authKey: "",
      enabled: true,
      tools: ["pdb_database", "chembl_database", "pubchem_search", "alphafold_fetch"]
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
      id: "railway",
      name: "Railway Cloud Hosting MCP",
      icon: "🚂",
      category: "Backend",
      author: "Railway",
      desc: "Deploy edge services, manage background containers, inspect build logs, and bind custom domains.",
      authPlaceholder: "railway_api_...",
      authKey: "ag_railway_token",
      enabled: true,
      tools: ["railway_deploy", "get_service_logs", "list_variables", "restart_service"]
    },
    {
      id: "netlify",
      name: "Netlify Edge & Deploy MCP",
      icon: "🌐",
      category: "Backend",
      author: "Netlify",
      desc: "Instant serverless deploys, edge function invocations, form submissions, and CDN cache purges.",
      authPlaceholder: "nfp_...",
      authKey: "ag_netlify_token",
      enabled: true,
      tools: ["netlify_deploy", "purge_cdn_cache", "list_deployments"]
    },
    {
      id: "vercel",
      name: "Vercel AI & Cloud SDK MCP",
      icon: "▲",
      category: "Backend",
      author: "Vercel Official",
      desc: "Vercel Functions, Edge Middleware, Blob Storage, AI SDK streaming, and preview URL generation.",
      authPlaceholder: "vercel_token_...",
      authKey: "ag_vercel_token",
      enabled: true,
      tools: ["deploy_vercel", "get_env_vars", "list_projects", "inspect_metrics"]
    },
    {
      id: "google-workspace",
      name: "Google Workspace MCP",
      icon: "📁",
      category: "Productivity",
      author: "Google",
      desc: "Connect directly to Google Docs, Sheets, Slides, Drive files, and Google Calendar events.",
      authPlaceholder: "OAuth2 Workspace Token",
      authKey: "ag_google_workspace_token",
      enabled: true,
      tools: ["docs_read", "sheets_update", "slides_generate", "calendar_schedule"]
    },
    {
      id: "chrome-devtools",
      name: "Chrome DevTools & DOM Inspector MCP",
      icon: "🔍",
      category: "Developer Tools",
      author: "Google Chrome",
      desc: "Live browser automation, DOM accessibility audits (a11y), network timeline inspection, and console logs.",
      authPlaceholder: "Built-in Browser Inspector",
      authKey: "",
      enabled: true,
      tools: ["inspect_dom", "capture_screenshot", "audit_a11y", "get_console_logs"]
    },
    {
      id: "coderabbit",
      name: "CodeRabbit Automated Reviewer MCP",
      icon: "🐇",
      category: "Developer Tools",
      author: "CodeRabbit AI",
      desc: "Autonomous pull request reviews, SAST security vulnerability triage, and automated 1-click autofix plans.",
      authPlaceholder: "coderabbit_api_...",
      authKey: "ag_coderabbit_token",
      enabled: true,
      tools: ["review_pr", "generate_autofix", "sast_audit"]
    },
    {
      id: "mobbin",
      name: "Mobbin UI/UX Design Flows MCP",
      icon: "📱",
      category: "Design",
      author: "Mobbin",
      desc: "Search world-class iOS, iPadOS, and web UI screens, user journey flows, and design tear-downs.",
      authPlaceholder: "mobbin_token_...",
      authKey: "ag_mobbin_token",
      enabled: false,
      tools: ["search_screens", "search_flows", "get_collection"]
    },
    {
      id: "firebase",
      name: "Firebase & Firestore Rules MCP",
      icon: "🔥",
      category: "Backend",
      author: "Google Firebase",
      desc: "Firestore database access, declarative security rules authoring (firestore.rules), and Auth config.",
      authPlaceholder: "firebase_service_account.json",
      authKey: "ag_firebase_token",
      enabled: true,
      tools: ["lint_rules", "deploy_firestore", "manage_auth"]
    },
    {
      id: "databricks",
      name: "Databricks Unified Analytics MCP",
      icon: "🧱",
      category: "Backend",
      author: "Databricks",
      desc: "Run Spark SQL queries, manage Lakeflow data pipelines, Unity Catalog metric views, and DABs.",
      authPlaceholder: "dapi_...",
      authKey: "ag_databricks_token",
      enabled: false,
      tools: ["run_spark_sql", "list_catalogs", "lakeflow_status"]
    },
    {
      id: "pandadoc",
      name: "PandaDoc Smart Contracts MCP",
      icon: "📄",
      category: "Business",
      author: "PandaDoc",
      desc: "Create legally binding proposals, automated NDAs, employment agreements, and audit signing velocity.",
      authPlaceholder: "panda_api_...",
      authKey: "ag_pandadoc_token",
      enabled: false,
      tools: ["create_document", "check_signing_status", "send_nda"]
    },
    {
      id: "monday",
      name: "Monday.com Work OS MCP",
      icon: "📊",
      category: "Productivity",
      author: "Monday.com",
      desc: "Query board workspaces, update task columns, sync milestones, and automate team assignment.",
      authPlaceholder: "monday_api_...",
      authKey: "ag_monday_token",
      enabled: false,
      tools: ["query_boards", "update_column_value", "list_workspaces"]
    },
    {
      id: "leapwork",
      name: "Leapwork Play QA & Automation MCP",
      icon: "🎮",
      category: "Developer Tools",
      author: "Leapwork",
      desc: "Execute end-to-end regression runlists, trigger visual automation flows, and analyze test reports.",
      authPlaceholder: "leapwork_api_...",
      authKey: "ag_leapwork_token",
      enabled: false,
      tools: ["play_run_test", "play_list_capabilities", "play_get_artifacts"]
    },
    {
      id: "gemini-docs",
      name: "Gemini Official Documentation MCP",
      icon: "📖",
      category: "Research",
      author: "Google DeepMind",
      desc: "Live search of official Google Gemini API docs, SDK reference for Python/JS/Go, and migration guides.",
      authPlaceholder: "Direct Upstream Docs (No key needed)",
      authKey: "",
      enabled: true,
      tools: ["gemini_search_docs", "gemini_get_doc"]
    },
    {
      id: "arxiv",
      name: "arXiv Academic Literature MCP",
      icon: "📚",
      category: "Research",
      author: "Cornell arXiv",
      desc: "Search computer science preprints, AI papers, mathematical physics derivations, and extract PDF text.",
      authPlaceholder: "Public Open Access",
      authKey: "",
      enabled: true,
      tools: ["search_arxiv", "download_paper_text", "extract_citations"]
    },
    {
      id: "subagents-fleet",
      name: "Multi-Agent Subagent Fleet MCP",
      icon: "🤖",
      category: "Developer Tools",
      author: "Antigravity Autonomous Core",
      desc: "Orchestrate 8 specialized parallel subagents (Research, Code Reviewer, Architect, Deployment, etc.).",
      authPlaceholder: "Built-in Autonomous Engine",
      authKey: "",
      enabled: true,
      tools: ["invoke_subagent", "dispatch_parallel", "send_agent_message"]
    }
  ];

  const DEFAULT_SUBAGENTS = [
    {
      id: "research",
      name: "Research Subagent",
      role: "Codebase & arXiv Explorer",
      icon: "🔍",
      model: "flash",
      desc: "Read-only exploration of repository files, arXiv preprints, and official documentation without context clutter.",
      tools: ["read_file", "search_web", "list_resources"]
    },
    {
      id: "code-reviewer",
      name: "Code Reviewer",
      role: "SAST & Diff Auditor",
      icon: "🧐",
      model: "pro",
      desc: "Runs automated code reviews, type safety checks, and security flaw detection before commits.",
      tools: ["run_command", "git_diff", "check_syntax"]
    },
    {
      id: "ai-architect",
      name: "AI Architect",
      role: "AI SDK & Agent Designer",
      icon: "🧠",
      model: "pro",
      desc: "Specializes in architecting AI features, AI SDK streaming, durable workflows, and MCP server bridges.",
      tools: ["mcp_call", "plan_architect", "eval_models"]
    },
    {
      id: "deployment-expert",
      name: "Deployment Expert",
      role: "CI/CD & Cloud Specialist",
      icon: "🚀",
      model: "flash",
      desc: "Specializes in deployment strategies, CI/CD pipelines, preview URLs, domain routing, and rollbacks.",
      tools: ["railway_deploy", "netlify_deploy", "vercel_deploy"]
    },
    {
      id: "performance-optimizer",
      name: "Performance Optimizer",
      role: "Vitals & Bundle Tuner",
      icon: "⚡",
      model: "flash",
      desc: "Investigates slow rendering, Core Web Vitals, memory leaks, and client-side asset optimization.",
      tools: ["chrome_devtools", "heap_snapshot", "lighthouse"]
    },
    {
      id: "image-generator",
      name: "Image & Visual Generator",
      role: "Mermaid & SVG Generator",
      icon: "🎨",
      model: "flash",
      desc: "Generates UI wireframes, flowcharts, KaTeX charts, and vector diagrams.",
      tools: ["generate_mermaid", "generate_svg", "canva_design"]
    },
    {
      id: "firestore-rules-author",
      name: "Firestore Rules Author",
      role: "Security Rules Specialist",
      icon: "🛡️",
      model: "flash",
      desc: "Specialist subagent for Firebase Authentication and Cloud Firestore declarative security rules.",
      tools: ["firestore_lint", "test_rules"]
    },
    {
      id: "self",
      name: "Self Subagent",
      role: "Recursive Generalist",
      icon: "🧬",
      model: "inherit",
      desc: "Inherits parent agent's full tools, context, and permissions to execute parallel tasks.",
      tools: ["all_tools"]
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
      cadence: "daily",
      time: "08:00",
      schedule: "Every morning at 08:00 AM",
      cron: "0 8 * * *",
      prompt: "/quiz Generate a challenging JEE Advanced calculus or electrodynamics problem with step-by-step proof.",
      status: "active",
      lastRun: "Today, 08:00 AM",
      enabled: true
    },
    {
      id: "auto-sync",
      title: "PC Brain & Transcripts Auto-Sync",
      cadence: "interval",
      intervalMinutes: 30,
      schedule: "Every 30 minutes",
      cron: "*/30 * * * *",
      prompt: "/sync",
      status: "active",
      lastRun: "10 mins ago",
      enabled: true
    },
    {
      id: "auto-admissions",
      title: "Singapore Admissions Profile Audit",
      cadence: "weekly",
      day: "Monday",
      time: "09:00",
      schedule: "Weekly on Mondays at 09:00 AM",
      cron: "0 9 * * 1",
      prompt: "Audit my current GitHub portfolio and prepare SMU SCIS & NUS interview talking points.",
      status: "scheduled",
      lastRun: "3 days ago",
      enabled: true
    },
    {
      id: "auto-repo",
      title: "GitHub Repo Health Watcher",
      cadence: "interval",
      intervalMinutes: 120,
      schedule: "Every 2 hours",
      cron: "0 */2 * * *",
      prompt: "Check Happ3ns/JEE-Quiz-Generator for commit status, build issues, and suggest optimizations.",
      status: "active",
      lastRun: "45 mins ago",
      enabled: true
    },
    {
      id: "auto-arxiv",
      title: "Daily arXiv AI Research Sweep",
      cadence: "daily",
      time: "10:00",
      schedule: "Daily at 10:00 AM",
      cron: "0 10 * * *",
      prompt: "/search Latest breakthrough papers on LLM agentic reasoning, code synthesis, and autonomous tools.",
      status: "scheduled",
      lastRun: "Yesterday",
      enabled: true
    },
    {
      id: "auto-backup",
      title: "Nightly Obsidian & Workspace Backup",
      cadence: "daily",
      time: "23:00",
      schedule: "Daily at 11:00 PM",
      cron: "0 23 * * *",
      prompt: "/plan Export active sessions and markdown artifacts to local storage backup.",
      status: "scheduled",
      lastRun: "Yesterday",
      enabled: true
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
      const saved = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (!saved) return "gemini-3.8-flash";
      // Auto-migrate retired/deprecated model IDs to active Gemini 3.8 / 4 models
      if (
        saved === "gemini-2.5-flash" ||
        saved === "gemini-2.0-flash" ||
        saved === "gemini-2.0-flash-thinking-exp" ||
        saved.startsWith("gemini-1.5")
      ) {
        localStorage.setItem(STORAGE_KEYS.MODEL, "gemini-3.8-flash");
        return "gemini-3.8-flash";
      }
      if (saved === "gemini-2.5-pro") {
        localStorage.setItem(STORAGE_KEYS.MODEL, "gemini-4-argon");
        return "gemini-4-argon";
      }
      return saved;
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
        if (!raw) return DEFAULT_SKILLS;
        const stored = JSON.parse(raw);
        const existingIds = new Set(stored.map(s => s.id));
        const merged = [...stored];
        DEFAULT_SKILLS.forEach(s => {
          if (!existingIds.has(s.id)) merged.push(s);
        });
        return merged;
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

    // ── Subagents Hub (Desktop Antigravity Fleet) ──
    getSubagents: function () {
      return DEFAULT_SUBAGENTS;
    },

    // ── Plugins & MCP Marketplace ──
    getPlugins: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PLUGINS);
        if (!raw) return DEFAULT_PLUGINS;
        const stored = JSON.parse(raw);
        const existingIds = new Set(stored.map(p => p.id));
        const merged = [...stored];
        DEFAULT_PLUGINS.forEach(p => {
          if (!existingIds.has(p.id)) merged.push(p);
        });
        return merged;
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
        if (!raw) return DEFAULT_AUTOMATIONS;
        const stored = JSON.parse(raw);
        const existingIds = new Set(stored.map(a => a.id));
        const merged = [...stored];
        DEFAULT_AUTOMATIONS.forEach(a => {
          if (!existingIds.has(a.id)) merged.push(a);
        });
        return merged;
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

    updateAutomation: function (id, updates) {
      const list = this.getAutomations();
      const idx = list.findIndex(a => a.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        this.setAutomations(list);
      }
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
