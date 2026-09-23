#!/usr/bin/env node
/**
 * dev-local.mjs — run `next dev` together with a local PHP server so the
 * Contact form endpoint (/api/contact.php) can send mail-style requests
 * during development, mirroring the GoDaddy hosting environment.
 *
 * Next.js cannot execute .php files, so next.config.mjs (dev only) proxies
 * /api/contact.php to http://127.0.0.1:8080 where PHP serves the static
 * export directory (`out/`). This script starts that PHP server first.
 *
 * Usage: npm run dev            (extra args pass through to next dev)
 *        npm run dev -- -p 3010
 * Env:   MS_PHP_PORT (default 8080), MS_PHP_ORIGIN (default http://127.0.0.1:$PORT)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHP_PORT = Number(process.env.MS_PHP_PORT || 8080);
const PHP_ORIGIN = process.env.MS_PHP_ORIGIN || `http://127.0.0.1:${PHP_PORT}`;
const ENDPOINT = `${PHP_ORIGIN}/api/contact.php`;
const nextArgs = process.argv.slice(2);

const log = (msg) => console.log(`[dev-local] ${msg}`);
const warn = (msg) => console.warn(`[dev-local] WARNING: ${msg}`);

async function endpointAlive() {
  try {
    const res = await fetch(ENDPOINT, { method: 'GET' });
    // The endpoint is POST-only and answers 405 to GET when it is alive.
    return res.status === 405;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startPhp() {
  if (await endpointAlive()) {
    log(`reusing the PHP endpoint already running at ${ENDPOINT}`);
    return null; // not ours to kill
  }

  // Refuse to fight another service for the port.
  try {
    const busy = await fetch(`http://127.0.0.1:${PHP_PORT}/`, { method: 'GET' });
    if (busy.status !== 405) {
      warn(
        `port ${PHP_PORT} is used by something else (HTTP ${busy.status}). ` +
          `Set MS_PHP_PORT to a free port; the Contact form proxy targets ${PHP_ORIGIN}.`
      );
      return 'failed';
    }
  } catch {
    /* nothing listening — good, PHP can bind */
  }

  if (!existsSync(path.join(ROOT, 'out', 'api', 'contact.php'))) {
    warn('out/api/contact.php is missing — run `npm run build` once so the endpoint is exported.');
  }

  const php = spawn('php', ['-S', `127.0.0.1:${PHP_PORT}`, '-t', 'out'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  php.on('error', () => {
    warn('PHP is not installed/on PATH — the Contact form will not work locally.');
    warn('Install it (e.g. `brew install php`) or ignore this if you do not need the form.');
  });
  let stderr = '';
  php.stderr.on('data', (d) => {
    stderr += d;
  });

  for (let i = 0; i < 25; i++) {
    if (await endpointAlive()) {
      log(`local PHP endpoint ready at ${ENDPOINT} (pid ${php.pid})`);
      return php;
    }
    if (php.exitCode !== null) break;
    await sleep(200);
  }

  warn(`PHP server failed to become ready on port ${PHP_PORT}${stderr ? `:\n${stderr.trim()}` : ''}`);
  if (php.exitCode === null) php.kill('SIGTERM');
  return 'failed';
}

const phpProc = await startPhp();

function cleanup() {
  if (phpProc && typeof phpProc.kill === 'function' && phpProc.exitCode === null) {
    phpProc.kill('SIGTERM');
  }
}
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

log(`starting next dev${nextArgs.length ? ` ${nextArgs.join(' ')}` : ''} (Contact form proxies to ${PHP_ORIGIN})…`);
const next = spawn('npm', ['run', 'dev:next', '--', ...nextArgs], {
  cwd: ROOT,
  stdio: 'inherit',
});
next.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});