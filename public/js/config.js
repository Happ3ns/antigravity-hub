// ── Antigravity Studio Cloud Backend Configuration ──
// Deploy this repo to Vercel (with GEMINI_API_KEY set in Vercel Environment Variables)
// so visitors never need to enter an external API key.
// If you also host static frontend on GitHub Pages, set backendUrl below to your Vercel URL,
// e.g. "https://antigravity-hub.vercel.app/api/chat".
window.ANTIGRAVITY_CONFIG = window.ANTIGRAVITY_CONFIG || {
  backendUrl: "https://antigravity-hub-eight.vercel.app/api/chat"
};
