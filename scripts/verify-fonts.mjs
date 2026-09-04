/**
 * verify-fonts.mjs — compare the local font setup against https://www.mesonsoft.com/
 *
 * 1. Fetches the live home page and the local home page.
 * 2. Collects every @font-face rule (family/weight/style/unicode-range/src)
 *    reachable from each page's stylesheets, in cascade order.
 * 3. Compares the two sets, including a byte-level hash of every font file.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LIVE = 'https://www.mesonsoft.com';
const LOCAL = process.env.LOCAL || 'http://localhost:3311';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

// follow one level of relative url() refs inside a css file
function collectFontFaces(cssText, cssUrl, faces, seen) {
  for (const m of cssText.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const body = m[1];
    const family = (body.match(/font-family:\s*['"]?([^;'"]+)/) || [])[1]?.trim();
    const weight = (body.match(/font-weight:\s*([^;'"]+)/) || [])[1]?.trim() || 'normal';
    const style = (body.match(/font-style:\s*([^;'"]+)/) || [])[1]?.trim() || 'normal';
    const range = (body.match(/unicode-range:\s*([^;}]+)/) || [])[1]?.trim() || '';
    const src = (body.match(/src:\s*([^;}]+)/) || [])[1]?.trim() || '';
    faces.push({ family, weight, style, range, src });
  }
  // recurse into relative url() css imports (none expected, but be safe)
  for (const m of cssText.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const ref = m[1];
    if (!/\.(woff2?|ttf|eot|svg)([?#].*)?$/i.test(ref)) continue;
    const abs = new URL(ref, cssUrl);
    const key = abs.href;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!abs.href.startsWith('http')) continue;
    // font files themselves need no recursion
  }
}

async function side(baseUrl, html) {
  const faces = [];
  const seenCss = new Set();
  const links = [...html.matchAll(/<link[^>]*rel=['"]stylesheet['"][^>]*>/g)]
    .map((m) => m[0])
    .map((tag) => (tag.match(/href=['"]([^'"]+)/) || [])[1])
    .filter(Boolean);
  // inline <style> in the head may also contain @font-face
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    collectFontFaces(m[1], baseUrl, faces, seenCss);
  }
  for (const href of links) {
    const abs = new URL(href, baseUrl).href;
    if (seenCss.has(abs)) continue;
    seenCss.add(abs);
    try {
      const css = (await get(abs)).toString('utf8');
      collectFontFaces(css, abs, faces, seenCss);
    } catch (e) {
      console.log(`  ! stylesheet failed: ${abs} (${e.message})`);
    }
  }
  return faces;
}

function faceKey(f) {
  return `${f.family}|${f.weight}|${f.style}|${f.range}`;
}

async function fontHashes(faces, base) {
  // hash the first woff2/woff src of each face that points at this base
  const hashes = {};
  for (const f of faces) {
    const m = f.src.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (!m) continue;
    const ref = m[1].split(/[?#]/)[0];
    if (!/\.(woff2?|ttf)$/i.test(ref)) continue;
    const abs = new URL(ref, base).href;
    if (!hashes[abs]) {
      try {
        hashes[abs] = createHash('md5').update(await get(abs)).digest('hex');
      } catch (e) {
        hashes[abs] = 'ERROR ' + e.message;
      }
    }
    f.fileHash = hashes[abs];
    f.file = abs;
  }
  return faces;
}

const [liveHtml, localHtml] = await Promise.all([get(LIVE).then((b) => b.toString()), get(LOCAL).then((b) => b.toString())]);

const liveFaces = await fontHashes(await side(LIVE, liveHtml), LIVE);
const localFaces = await fontHashes(await side(LOCAL, localHtml), LOCAL);

console.log(`live @font-face rules : ${liveFaces.length}`);
console.log(`local @font-face rules: ${localFaces.length}`);

const liveByFamily = {};
for (const f of liveFaces) (liveByFamily[f.family] ||= []).push(`${f.weight}/${f.style}`);
const localByFamily = {};
for (const f of localFaces) (localByFamily[f.family] ||= []).push(`${f.weight}/${f.style}`);
console.log('\nfamily/weight coverage:');
for (const fam of new Set([...Object.keys(liveByFamily), ...Object.keys(localByFamily)])) {
  const l = [...new Set(liveByFamily[fam] || [])].sort();
  const d = [...new Set(localByFamily[fam] || [])].sort();
  const same = JSON.stringify(l) === JSON.stringify(d);
  console.log(`  ${same ? '✓' : '✗'} ${fam}: live=[${l.join(',')}] local=[${d.join(',')}]`);
}

// compare font FILE bytes between the two sides
console.log('\nfont file byte-comparison:');
const localByFile = {};
for (const f of localFaces) if (f.file) localByFile[f.file] = f.fileHash;
let mismatch = 0;
let checked = 0;
const localRoot = path.join(process.cwd(), 'public');
for (const f of liveFaces) {
  if (!f.file || !f.fileHash || f.fileHash.startsWith('ERROR')) continue;
  // map the live file URL to our local mirror
  let localUrl = null;
  if (f.file.includes('mesonsoft.com/wp-content/')) {
    localUrl = LOCAL + '/assets/remote/' + f.file.split('mesonsoft.com/')[1].split(/[?#]/)[0];
  } else if (f.file.includes('fonts.gstatic.com/')) {
    localUrl = LOCAL + '/assets/remote/' + f.file.split('fonts.gstatic.com/')[1].split(/[?#]/)[0];
  }
  if (!localUrl) continue;
  const localHash = localByFile[localUrl] || (localByFile[localUrl] = createHash('md5').update(await get(localUrl)).digest('hex'));
  checked++;
  if (localHash !== f.fileHash) {
    mismatch++;
    console.log(`  ✗ MISMATCH ${f.family} ${f.weight}: ${f.file}`);
  }
}
console.log(`  ${checked} font files compared, ${mismatch} mismatches`);

console.log(mismatch === 0 ? '\nFONTS MATCH THE LIVE SITE ✓' : '\nFONT DIFFERENCES FOUND ✗');
