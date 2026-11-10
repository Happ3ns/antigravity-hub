// ── Server-Side Real Agent Tools (Zero External NPM Dependencies) ──
const vm = require("node:vm");
const net = require("node:net");
const dns = require("node:dns").promises;

const DEFAULT_GITHUB_OWNER = "Happ3ns";
const FETCH_TIMEOUT_MS = 6500;

function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function isDisallowedHostname(hostname) {
  const h = (hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }

  const ipVersion = net.isIP(h);
  if (ipVersion === 4) {
    const parts = h.split(".").map(Number);
    const [a, b] = parts;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    ) {
      return true;
    }
  } else if (ipVersion === 6) {
    if (
      h === "::" ||
      h === "::1" ||
      h.startsWith("fc") ||
      h.startsWith("fd") ||
      h.startsWith("fe80") ||
      h.startsWith("::ffff:127.") ||
      h.startsWith("::ffff:10.") ||
      h.startsWith("::ffff:192.168.")
    ) {
      return true;
    }
  }
  return false;
}

function validatePublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    return { ok: false, error: "Invalid URL format." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// URLs are allowed." };
  }
  if (isDisallowedHostname(parsed.hostname)) {
    return { ok: false, error: "Access to private or local network addresses is blocked." };
  }
  return { ok: true, url: parsed };
}

function normalizeRepoName(repo) {
  const cleaned = String(repo || "antigravity-hub").trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned) return `${DEFAULT_GITHUB_OWNER}/antigravity-hub`;
  if (cleaned.includes("/")) return cleaned;
  return `${DEFAULT_GITHUB_OWNER}/${cleaned}`;
}

function buildGithubHeaders(token, accept = "application/vnd.github+json") {
  const headers = {
    Accept: accept,
    "User-Agent": "Antigravity-Hub-Agent/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runWebSearch({ query, limit = 6 }) {
  const q = String(query || "").trim();
  if (!q) return { error: "Search query cannot be empty." };
  const cap = Math.min(Math.max(Number(limit) || 6, 1), 10);
  const results = [];

  try {
    const res = await fetchWithTimeout(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AntigravityAgent/1.0; +https://github.com/Happ3ns/antigravity-hub)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    if (res.ok) {
      const html = await res.text();
      const blocks = html.split(/class="result\b/i).slice(1);
      for (const block of blocks) {
        if (results.length >= cap) break;
        const linkMatch = block.match(
          /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
        );
        if (!linkMatch) continue;
        let href = decodeHtmlEntities(linkMatch[1]);
        if (href.startsWith("//")) href = "https:" + href;
        try {
          const parsedHref = new URL(href);
          const uddg = parsedHref.searchParams.get("uddg");
          if (uddg) href = uddg;
        } catch (e) {}
        const title = stripTags(linkMatch[2]);
        const snipMatch = block.match(
          /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/i
        );
        const snippet = snipMatch ? stripTags(snipMatch[1]) : "";
        if (title && href.startsWith("http")) {
          results.push({ title, url: href, snippet });
        }
      }
    }
  } catch (e) {}

  if (results.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=${cap}`;
      const wRes = await fetchWithTimeout(wikiUrl, {
        headers: { "User-Agent": "Antigravity-Hub-Agent/1.0" },
      });
      if (wRes.ok) {
        const wJson = await wRes.json();
        for (const item of wJson?.query?.search || []) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            snippet: stripTags(item.snippet),
          });
        }
      }
    } catch (e) {}
  }

  return { query: q, count: results.length, results };
}

async function resolveAndValidatePublicUrl(rawUrl) {
  const check = validatePublicUrl(rawUrl);
  if (!check.ok) return check;
  const hostname = check.url.hostname.replace(/^\[|\]$/g, "");
  if (!net.isIP(hostname)) {
    try {
      const addrs = await dns.lookup(hostname, { all: true });
      for (const entry of addrs) {
        if (isDisallowedHostname(entry.address)) {
          return { ok: false, error: "Resolved target address is private or local." };
        }
      }
    } catch (e) {
      return { ok: false, error: `Could not resolve host "${hostname}".` };
    }
  }
  return check;
}

async function runFetchWebpage({ url }) {
  let currentUrl = String(url || "").trim();
  let res = null;

  for (let hop = 0; hop < 4; hop++) {
    const check = await resolveAndValidatePublicUrl(currentUrl);
    if (!check.ok) return { error: check.error };

    res = await fetchWithTimeout(check.url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AntigravityAgent/1.0)",
        Accept: "text/html,application/json,text/plain,*/*",
      },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      await res.body?.cancel?.().catch(() => {});
      if (!loc) return { error: `Redirect HTTP ${res.status} without Location.` };
      currentUrl = new URL(loc, check.url).toString();
      continue;
    }
    currentUrl = check.url.toString();
    break;
  }

  if (!res || (res.status >= 300 && res.status < 400)) {
    return { error: "Too many redirects." };
  }

  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (!res.ok) {
    return { error: `HTTP ${res.status} fetching ${currentUrl}`, preview: raw.slice(0, 400) };
  }

  let title = "";
  let text = raw;
  if (contentType.includes("html")) {
    const tMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (tMatch) title = stripTags(tMatch[1]);
    text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
    text = stripTags(text);
  }

  const truncated = text.length > 12000;
  return {
    url: currentUrl,
    status: res.status,
    title,
    truncated,
    content: text.slice(0, 12000),
  };
}

async function runGithubListRepos({ username }, ctx) {
  const owner = String(username || DEFAULT_GITHUB_OWNER).trim() || DEFAULT_GITHUB_OWNER;
  const res = await fetchWithTimeout(
    `https://api.github.com/users/${encodeURIComponent(owner)}/repos?sort=updated&per_page=20`,
    { headers: buildGithubHeaders(ctx.githubToken) }
  );
  const data = await res.json();
  if (!res.ok) return { error: data?.message || `GitHub HTTP ${res.status}` };
  return {
    owner,
    repos: (Array.isArray(data) ? data : []).map((r) => ({
      full_name: r.full_name,
      description: r.description || "",
      language: r.language || "",
      default_branch: r.default_branch,
      private: Boolean(r.private),
      url: r.html_url,
      updated_at: r.updated_at,
    })),
  };
}

async function runGithubReadTree({ repo, branch }, ctx) {
  const fullRepo = normalizeRepoName(repo);
  const tryBranches = branch ? [branch] : ["main", "master"];

  for (const br of tryBranches) {
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${fullRepo}/git/trees/${encodeURIComponent(br)}?recursive=1`,
      { headers: buildGithubHeaders(ctx.githubToken) }
    );
    if (res.ok) {
      const data = await res.json();
      const entries = (data.tree || []).slice(0, 220).map((n) => ({
        path: n.path,
        type: n.type,
        size: n.size || 0,
      }));
      return {
        repo: fullRepo,
        branch: br,
        total_entries: (data.tree || []).length,
        truncated: Boolean(data.truncated) || (data.tree || []).length > 220,
        entries,
      };
    }
    if (res.status !== 404 || branch) {
      const err = await res.json().catch(() => ({}));
      return { error: err?.message || `GitHub HTTP ${res.status}` };
    }
  }
  return { error: `Repository tree not found for ${fullRepo}` };
}

async function runGithubReadFile({ repo, path: filePath, branch }, ctx) {
  const fullRepo = normalizeRepoName(repo);
  const cleanPath = String(filePath || "").replace(/^\/+/, "");
  if (!cleanPath) return { error: "File path is required." };

  const tryBranches = branch ? [branch] : ["main", "master"];
  let lastErr = "File not found";
  for (const br of tryBranches) {
    const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${fullRepo}/contents/${encodedPath}?ref=${encodeURIComponent(br)}`,
      { headers: buildGithubHeaders(ctx.githubToken, "application/vnd.github.raw+json") }
    );
    if (res.ok) {
      const content = await res.text();
      return {
        repo: fullRepo,
        branch: br,
        path: cleanPath,
        truncated: content.length > 18000,
        total_chars: content.length,
        content: content.slice(0, 18000),
      };
    }
    lastErr = `GitHub HTTP ${res.status}`;
    if (res.status !== 404 || branch) break;
  }
  return { error: `${lastErr} reading ${fullRepo}/${cleanPath}` };
}

async function runGithubSearchCode({ query, repo }, ctx) {
  const q = String(query || "").trim();
  if (!q) return { error: "Search query is required." };
  const scope = repo ? `repo:${normalizeRepoName(repo)}` : `user:${DEFAULT_GITHUB_OWNER}`;
  const res = await fetchWithTimeout(
    `https://api.github.com/search/code?q=${encodeURIComponent(`${q} ${scope}`)}&per_page=10`,
    { headers: buildGithubHeaders(ctx.githubToken) }
  );
  if (res.ok) {
    const data = await res.json();
    return {
      query: q,
      scope,
      total_count: data.total_count || 0,
      items: (data.items || []).map((it) => ({
        name: it.name,
        path: it.path,
        repo: it.repository?.full_name,
        url: it.html_url,
      })),
    };
  }
  // Unauthenticated GitHub code search returns 401; fall back to path matching in repo tree
  if (repo) {
    const tree = await runGithubReadTree({ repo }, ctx);
    if (!tree.error) {
      const lower = q.toLowerCase();
      const matches = (tree.entries || []).filter((e) =>
        e.path.toLowerCase().includes(lower)
      );
      return {
        query: q,
        scope,
        note: "Matched file paths in repository tree (add GitHub token in Settings for full-text code search).",
        items: matches.slice(0, 20),
      };
    }
  }
  const err = await res.json().catch(() => ({}));
  return { error: err?.message || `GitHub search HTTP ${res.status}` };
}

async function runGithubCommitFile({ repo, path: filePath, content, message, branch }, ctx) {
  if (!ctx.githubToken) {
    return {
      error:
        "GitHub write permission requires a GitHub Personal Access Token configured in Settings -> GitHub Personal Access Token.",
    };
  }
  const fullRepo = normalizeRepoName(repo);
  const cleanPath = String(filePath || "").replace(/^\/+/, "");
  const targetBranch = String(branch || "main").trim() || "main";
  if (!cleanPath || typeof content !== "string") {
    return { error: "path and string content are required." };
  }

  const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
  const apiUrl = `https://api.github.com/repos/${fullRepo}/contents/${encodedPath}`;
  let existingSha;
  const metaRes = await fetchWithTimeout(`${apiUrl}?ref=${encodeURIComponent(targetBranch)}`, {
    headers: buildGithubHeaders(ctx.githubToken),
  });
  if (metaRes.ok) {
    const meta = await metaRes.json();
    existingSha = meta?.sha;
  }

  const commitRes = await fetchWithTimeout(apiUrl, {
    method: "PUT",
    headers: {
      ...buildGithubHeaders(ctx.githubToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message || `Update ${cleanPath} via Antigravity Hub`,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: targetBranch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
  const result = await commitRes.json().catch(() => ({}));
  if (!commitRes.ok) {
    return { error: result?.message || `GitHub commit failed (HTTP ${commitRes.status})` };
  }
  return {
    committed: true,
    repo: fullRepo,
    branch: targetBranch,
    path: cleanPath,
    commit_sha: result?.commit?.sha,
    commit_url: result?.commit?.html_url,
  };
}

function runJavascriptSandbox({ code }) {
  const source = String(code || "").trim();
  if (!source) return { error: "Code cannot be empty." };
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map(formatLogArg).join(" ")),
      warn: (...args) => logs.push("[warn] " + args.map(formatLogArg).join(" ")),
      error: (...args) => logs.push("[error] " + args.map(formatLogArg).join(" ")),
    },
    Math,
    JSON,
    Date,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  };

  try {
    const context = vm.createContext(sandbox);
    const wrapped = `(function(){ "use strict"; ${source} })()`;
    let value;
    try {
      value = vm.runInContext(wrapped, context, { timeout: 1500 });
    } catch (syntaxErr) {
      // Fallback: if single expression (e.g., "Math.sqrt(2)"), evaluate directly
      value = vm.runInContext(source, context, { timeout: 1500 });
    }
    return {
      ok: true,
      result: value === undefined ? null : value,
      logs: logs.slice(0, 60),
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message || String(err),
      logs: logs.slice(0, 60),
    };
  }
}

function formatLogArg(v) {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
}

async function runArxivSearch({ query, maxResults = 5 }) {
  const q = String(query || "").trim();
  if (!q) return { error: "Query is required." };
  const max = Math.min(Math.max(Number(maxResults) || 5, 1), 8);
  const res = await fetchWithTimeout(
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${max}`,
    { headers: { "User-Agent": "Antigravity-Hub-Agent/1.0" } }
  );
  if (!res.ok) return { error: `arXiv HTTP ${res.status}` };
  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1).map((entry) => {
    const getTag = (tag) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? decodeHtmlEntities(m[1]).replace(/\s+/g, " ").trim() : "";
    };
    const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/gi)].map((m) =>
      decodeHtmlEntities(m[1]).trim()
    );
    return {
      id: getTag("id"),
      title: getTag("title"),
      published: getTag("published"),
      authors,
      summary: getTag("summary").slice(0, 650),
    };
  });
  return { query: q, count: entries.length, entries };
}

async function runPubchemLookup({ compound }) {
  const name = String(compound || "").trim();
  if (!name) return { error: "Compound name or CID is required." };
  const res = await fetchWithTimeout(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`,
    { headers: { "User-Agent": "Antigravity-Hub-Agent/1.0" } }
  );
  if (!res.ok) return { error: `PubChem HTTP ${res.status} for "${name}"` };
  const data = await res.json();
  return { compound: name, properties: data?.PropertyTable?.Properties || [] };
}

function getToolDeclarations(options = {}) {
  const { webSearchEnabled = true, allowMutations = true } = options;

  const decls = [
    ...(webSearchEnabled
      ? [
          {
            name: "web_search",
            description:
              "Search the live web (DuckDuckGo / Wikipedia fallback) for current facts, documentation, university admissions criteria, and technical references.",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING", description: "Concise search query." },
                limit: { type: "INTEGER", description: "Max results (1-10)." },
              },
              required: ["query"],
            },
          },
          {
            name: "fetch_webpage",
            description:
              "Fetch and extract readable plain text and title from a public https:// or http:// webpage URL.",
            parameters: {
              type: "OBJECT",
              properties: {
                url: { type: "STRING", description: "Public URL starting with https:// or http://." },
              },
              required: ["url"],
            },
          },
        ]
      : []),
    {
      name: "github_list_repos",
      description:
        "List GitHub repositories for a user (defaults to Happ3ns) with descriptions, primary language, and default branch.",
      parameters: {
        type: "OBJECT",
        properties: {
          username: { type: "STRING", description: "GitHub username (defaults to Happ3ns)." },
        },
      },
    },
    {
      name: "github_read_tree",
      description:
        "List files and directories in a GitHub repository (defaults owner to Happ3ns if only repo name is provided).",
      parameters: {
        type: "OBJECT",
        properties: {
          repo: { type: "STRING", description: "Repository e.g. Happ3ns/antigravity-hub or JEE-Quiz-Generator." },
          branch: { type: "STRING", description: "Branch name (optional; defaults to main/master)." },
        },
        required: ["repo"],
      },
    },
    {
      name: "github_read_file",
      description:
        "Read the exact source code or text contents of a file from a GitHub repository.",
      parameters: {
        type: "OBJECT",
        properties: {
          repo: { type: "STRING", description: "Repository e.g. Happ3ns/antigravity-hub." },
          path: { type: "STRING", description: "File path inside the repo e.g. api/chat.js." },
          branch: { type: "STRING", description: "Branch name (optional)." },
        },
        required: ["repo", "path"],
      },
    },
    {
      name: "github_search_code",
      description: "Search code or file paths across Happ3ns GitHub repositories or a specific repo.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "Search keyword or symbol." },
          repo: { type: "STRING", description: "Optional repo filter e.g. Happ3ns/antigravity-hub." },
        },
        required: ["query"],
      },
    },
    ...(allowMutations
      ? [
          {
            name: "github_commit_file",
            description:
              "Create or update a file in a GitHub repository (requires the user's GitHub Personal Access Token configured in Settings).",
            parameters: {
              type: "OBJECT",
              properties: {
                repo: { type: "STRING", description: "Target repo e.g. Happ3ns/antigravity-hub." },
                path: { type: "STRING", description: "File path in repo." },
                content: { type: "STRING", description: "Full UTF-8 file content to commit." },
                message: { type: "STRING", description: "Clear commit message." },
                branch: { type: "STRING", description: "Target branch (defaults to main)." },
              },
              required: ["repo", "path", "content", "message"],
            },
          },
        ]
      : []),
    {
      name: "run_javascript",
      description:
        "Execute JavaScript inside an isolated VM sandbox (no network/filesystem) to verify algorithms, integrals/numerical approximations, JSON transforms, or unit calculations.",
      parameters: {
        type: "OBJECT",
        properties: {
          code: { type: "STRING", description: "JavaScript snippet to run; use return or console.log." },
        },
        required: ["code"],
      },
    },
    {
      name: "arxiv_search",
      description: "Search arXiv scientific papers and preprints for abstracts, authors, and paper links.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "Research query." },
          maxResults: { type: "INTEGER", description: "Number of entries (1-8)." },
        },
        required: ["query"],
      },
    },
    {
      name: "pubchem_lookup",
      description: "Look up chemical properties (formula, molecular weight, SMILES, IUPAC name) from PubChem.",
      parameters: {
        type: "OBJECT",
        properties: {
          compound: { type: "STRING", description: "Chemical name e.g. aspirin or caffeine." },
        },
        required: ["compound"],
      },
    },
    ...(allowMutations
      ? [
          {
            name: "create_artifact",
            description:
              "Create a rich Markdown or HTML artifact displayed as a card in chat and opened in the user's Artifacts Studio pane (use for plans, detailed reports, guides, or standalone HTML widgets).",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Filename ending in .md or .html e.g. implementation-plan.md" },
                subtitle: { type: "STRING", description: "Short description of the artifact." },
                content: { type: "STRING", description: "Full Markdown or HTML content." },
              },
              required: ["name", "content"],
            },
          },
          {
            name: "save_memory_rule",
            description:
              "Persist a permanent user rule or preference into the browser's AGENTS.md memory vault.",
            parameters: {
              type: "OBJECT",
              properties: {
                rule: { type: "STRING", description: "Concise rule text to remember across sessions." },
              },
              required: ["rule"],
            },
          },
        ]
      : []),
  ];

  return [{ functionDeclarations: decls }];
}

async function executeToolCall(name, args = {}, ctx = {}) {
  switch (name) {
    case "web_search":
      return { output: await runWebSearch(args) };
    case "fetch_webpage":
      return { output: await runFetchWebpage(args) };
    case "github_list_repos":
      return { output: await runGithubListRepos(args, ctx) };
    case "github_read_tree":
      return { output: await runGithubReadTree(args, ctx) };
    case "github_read_file":
      return { output: await runGithubReadFile(args, ctx) };
    case "github_search_code":
      return { output: await runGithubSearchCode(args, ctx) };
    case "github_commit_file":
      return { output: await runGithubCommitFile(args, ctx) };
    case "run_javascript":
      return { output: runJavascriptSandbox(args) };
    case "arxiv_search":
      return { output: await runArxivSearch(args) };
    case "pubchem_lookup":
      return { output: await runPubchemLookup(args) };
    case "create_artifact": {
      const artifact = {
        name: String(args.name || "artifact.md"),
        subtitle: String(args.subtitle || "Generated Studio Artifact"),
        content: String(args.content || ""),
      };
      if (typeof ctx.onArtifact === "function") ctx.onArtifact(artifact);
      return { output: { status: "created", name: artifact.name, chars: artifact.content.length } };
    }
    case "save_memory_rule": {
      const rule = String(args.rule || "").trim();
      if (!rule) return { output: { error: "Rule cannot be empty." } };
      if (typeof ctx.onRuleSaved === "function") ctx.onRuleSaved(rule);
      return { output: { status: "saved", rule } };
    }
    default:
      return { output: { error: `Unknown tool: ${name}` } };
  }
}

module.exports = {
  getToolDeclarations,
  executeToolCall,
  validatePublicUrl,
  runJavascriptSandbox,
  normalizeRepoName,
};
