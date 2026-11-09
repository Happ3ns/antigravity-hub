// ── Client State, PIN Security & Storage Engine ──
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
    ACTIVE_SESSION_ID: "ag_active_session_id"
  };

  const DEFAULT_PIN = "1234";

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
    }
  };

  root.Store = Store;

})(typeof window !== "undefined" ? window : globalThis);
