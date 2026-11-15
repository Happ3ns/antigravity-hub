// ── Antigravity Hub Automated Test Suite (Zero Dependencies) ──
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

const chatHandler = require("../api/chat.js");
const syncHandler = require("../api/sync.js");
const {
  runJavascriptSandbox,
  validatePublicUrl,
  normalizeRepoName,
} = require("../api/_tools.js");

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    ended: false,
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    writeHead(code, headers = {}) {
      this.statusCode = code;
      for (const [k, v] of Object.entries(headers)) {
        this.headers[k.toLowerCase()] = v;
      }
    },
    json(data) {
      this.setHeader("content-type", "application/json");
      this.body = JSON.stringify(data);
      this.ended = true;
    },
    end(data) {
      if (data) this.body = data;
      this.ended = true;
    },
    write(chunk) {
      this.body += chunk;
    },
  };
}

test("1. GET /api/chat returns metadata and active defaultModel", async () => {
  const req = { method: "GET", headers: {} };
  const res = mockRes();
  await chatHandler(req, res);
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.ok, true);
  assert.strictEqual(data.defaultModel, "gemini-2.0-flash");
  assert.strictEqual(typeof data.passcodeRequired, "boolean");
});

test("2. Security: JavaScript Sandbox blocks prototype escape and process inspection", () => {
  // Test safe math
  const okRun = runJavascriptSandbox({ code: "Math.sqrt(144) + 10" });
  assert.strictEqual(okRun.ok, true);
  assert.strictEqual(okRun.result, 22);

  // Test dangerous process probe
  const probeRun = runJavascriptSandbox({ code: "process.env.GEMINI_API_KEY" });
  assert.strictEqual(probeRun.ok, false);
  assert.match(probeRun.error, /blocked|not defined/i);
});

test("3. Security: SSRF validator blocks local and cloud metadata IPs", () => {
  assert.strictEqual(validatePublicUrl("http://localhost:3000").ok, false);
  assert.strictEqual(validatePublicUrl("http://127.0.0.1:8080").ok, false);
  assert.strictEqual(validatePublicUrl("http://169.254.169.254/latest/meta-data").ok, false);
  assert.strictEqual(validatePublicUrl("http://192.168.1.1/admin").ok, false);
  assert.strictEqual(validatePublicUrl("https://en.wikipedia.org/wiki/Physics").ok, true);
});

test("4. Tools: normalizeRepoName correctly prefixes Happ3ns default", () => {
  assert.strictEqual(normalizeRepoName("antigravity-hub"), "Happ3ns/antigravity-hub");
  assert.strictEqual(normalizeRepoName("google/jax"), "google/jax");
  assert.strictEqual(normalizeRepoName(""), "Happ3ns/antigravity-hub");
});

test("5. Sync: GET /api/sync returns session list", async () => {
  const req = { method: "GET", headers: {}, url: "/api/sync" };
  const res = mockRes();
  await syncHandler(req, res);
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(Array.isArray(data.sessions));
});

test("6. Sandbox: Multi-statement JS execution with variables and returns", () => {
  const code = `
    const a = [1, 2, 3, 4, 5];
    const sum = a.reduce((acc, x) => acc + x * 2, 0);
    return sum;
  `;
  const run = runJavascriptSandbox({ code });
  assert.strictEqual(run.ok, true);
  assert.strictEqual(run.result, 30);
});

test("7. Auth: STUDIO_PASSCODE enforcement when configured", async () => {
  const prevPasscode = process.env.STUDIO_PASSCODE;
  process.env.STUDIO_PASSCODE = "secret-passcode-123";
  try {
    // 401 when missing passcode
    const unauthReq = { method: "POST", headers: {}, body: { prompt: "hello" } };
    const unauthRes = mockRes();
    await chatHandler(unauthReq, unauthRes);
    assert.strictEqual(unauthRes.statusCode, 401);

    // Rejection on wrong passcode
    const badReq = { method: "POST", headers: { "x-studio-passcode": "wrong" }, body: { prompt: "hello" } };
    const badRes = mockRes();
    await chatHandler(badReq, badRes);
    assert.strictEqual(badRes.statusCode, 401);
  } finally {
    if (prevPasscode === undefined) delete process.env.STUDIO_PASSCODE;
    else process.env.STUDIO_PASSCODE = prevPasscode;
  }
});
