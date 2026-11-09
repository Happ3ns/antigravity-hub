// ── Client State, PIN Security, Automations & Customizations Storage ──
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
- Execution: Wrap deep reasoning traces in <thinking>...</thinking> tags.`;

  const DEFAULT_SKILLS = [
    { id: "jee-tutor", name: "JEE Advanced Tutor", desc: "Physics & Mathematics problem generator with step-by-step calculus proofs.", enabled: true, icon: "🧪" },
    { id: "singapore-admissions", name: "Singapore Uni Admissions", desc: "SMU SCIS Discovery Day & NUS Computing portfolio optimization.", enabled: true, icon: "🏛️" },
    { id: "code-reviewer", name: "Code Reviewer", desc: "Automated security, type safety, and algorithmic complexity checks.", enabled: true, icon: "💻" },
    { id: "spec-architect", name: "Spec Architect", desc: "Generates multi-stage architecture specs and markdown artifacts.", enabled: true, icon: "📝" },
    { id: "browser-agent", name: "Web & Paper Researcher", desc: "Searches arXiv preprints, technical RFCs, and documentation.", enabled: true, icon: "🔍" }
  ];

  const DEFAULT_AUTOMATIONS = [
    {
      id: "auto-jee",
      title: "Daily JEE Practice Question",
      schedule: "Every morning at 08:00 AM",
      prompt: "/quiz Generate a challenging JEE Advanced calculus or electrodynamics problem.",
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
      prompt: "Check Happ3ns/JEE-Quiz-Generator for commit status and suggest optimizations.",
      status: "active",
      lastRun: "45 mins ago",
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

    // Custom Rules
    getRules: function () {
      return localStorage.getItem(STORAGE_KEYS.RULES) || DEFAULT_RULES;
    },

    setRules: function (rules) {
      localStorage.setItem(STORAGE_KEYS.RULES, rules);
    },

    // Custom Skills
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

    // Automations
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

    // Keyboard & Appearance
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
