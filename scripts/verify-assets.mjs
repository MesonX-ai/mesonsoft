import fs from 'node:fs';

const BASE = 'http://localhost:3311';
const routes = ['/', '/about', '/contact'];
const bad = [];

for (const route of routes) {
  const html = await (await fetch(BASE + route)).text();
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('/assets/')) urls.add(u);
    }
  }
  // inline style / css url() refs inside the served HTML
  for (const m of html.matchAll(/url\((['"]?)([^)"']+)\1\)/g)) {
    if (m[2].startsWith('/assets/')) urls.add(m[2]);
  }
  let ok = 0;
  for (const u of urls) {
    const r = await fetch(BASE + encodeURI(u));
    if (r.ok) ok++;
    else bad.push(`${route} ${u} -> ${r.status}`);
  }
  console.log(`${route} -> ${urls.size} local assets referenced, ${ok} ok, ${urls.size - ok} failed`);
}

// check every css file's internal url() refs resolve
const cssDir = 'public/assets';
const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
const badCss = [];
for (const f of cssFiles) {
  const css = fs.readFileSync(`${cssDir}/${f}`, 'utf8');
  const urls = new Set();
  for (const m of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
    if (m[2].startsWith('/assets/')) urls.add(m[2]);
  }
  for (const u of urls) {
    try {
      await fs.promises.access('public' + decodeURIComponent(u).split(/[?#]/)[0]);
    } catch {
      badCss.push(`${f} -> ${u}`);
    }
  }
}
console.log(`checked ${cssFiles.length} css files for local url() refs; missing: ${badCss.length}`);
if (badCss.length) console.log(badCss.slice(0, 10).join('\n'));

if (bad.length) {
  console.log('\nFAILED ASSET REQUESTS:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('\nAll referenced assets resolve OK.');
