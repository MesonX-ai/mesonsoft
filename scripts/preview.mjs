// scripts/preview.mjs — serve the static export locally for a quick look.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "out");
const PORT = Number(process.env.PORT || 3000);

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

// Saved files whose names have no extension (or only parentheses), so extname()
// fails — e.g. the Google Fonts stylesheets "css", "css2", "css(1)", "css(2)".
// Browsers refuse to parse stylesheets served as application/octet-stream,
// which breaks the Spartan/Quicksand @font-face rules (nav menu labels and
// paragraphs fall back to Times). Serve them with their real MIME types.
const EXACT_TYPES = {
  css: "text/css",
  css2: "text/css",
  "css(1)": "text/css",
  "css(2)": "text/css",
  js: "text/javascript",
};


const server = createServer((req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0]);
  let path = normalize(join(ROOT, url));
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (statSync(path, { throwIfNoEntry: false })?.isDirectory()) {
    path = join(path, "index.html");
  }
  if (!existsSync(path)) {
    // /about -> out/about.html (exported without a trailing slash)
    const asFile = path + ".html";
    if (existsSync(asFile)) {
      path = asFile;
    } else {
      path = join(ROOT, "404.html");
      res.statusCode = 404;
    }
  }
  try {
    const body = readFileSync(path);
    const base = path.split("/").pop();
    const type = EXACT_TYPES[base] || TYPES[extname(path)] || "application/octet-stream";
    res.writeHead(res.statusCode || 200, { "Content-Type": type });
    res.end(body);
  } catch {
    res.writeHead(500).end("Server error");
  }
});

server.listen(PORT, () => console.log(`Previewing build at http://localhost:${PORT}`));
