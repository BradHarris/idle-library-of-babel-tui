#!/usr/bin/env node
// Verification harness for the Library of Babel web UI.
// Usage: see SKILL.md next to this file. Commands: launch | doctor | run | stop | list
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const SKILL = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SKILL, '../../..');
const RUNS = path.join(SKILL, 'runs');
const ARTIFACTS = path.join(SKILL, 'artifacts');
const FIREFOX = process.env.BABEL_FIREFOX || '/usr/bin/firefox';
const SAVE_KEY = 'library-of-babel:save';
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 }, // >= lg (1024): every panel visible, tab bar hidden
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true }, // < lg: one panel at a time, bottom tab bar
};

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).trim();

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function runDirs() {
  return fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter(d => fs.existsSync(path.join(RUNS, d, 'instance.json'))) : [];
}

/** The instance a command acts on: --run <id>, or the only one running. */
function currentRun() {
  const id = flag('run');
  const all = runDirs();
  if (id) {
    if (!all.includes(id)) die(`no run "${id}" (have: ${all.join(', ') || 'none'})`);
    return readInstance(id);
  }
  if (all.length === 0) die('no instance running; start one with `node babel.mjs launch`');
  if (all.length > 1) die(`several instances running (${all.join(', ')}); pass --run <id>`);
  return readInstance(all[0]);
}

const readInstance = id => JSON.parse(fs.readFileSync(path.join(RUNS, id, 'instance.json'), 'utf8'));

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function freePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = port => {
      if (port > start + 100) return reject(new Error('no free port'));
      const srv = net.createServer();
      srv.once('error', () => tryPort(port + 1));
      srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(port)));
    };
    tryPort(start);
  });
}

async function httpOk(url) {
  try {
    const res = await fetch(url);
    return { ok: res.ok, status: res.status, body: await res.text() };
  } catch (err) {
    return { ok: false, status: 0, body: String(err) };
  }
}

async function openBrowser(inst) {
  const browser = await puppeteer.launch({ browser: 'firefox', executablePath: FIREFOX, headless: true });
  // Record the pid so `stop` can kill a browser orphaned by a crashed run
  const pid = browser.process()?.pid;
  if (pid && inst) fs.writeFileSync(path.join(RUNS, inst.id, `browser-${pid}.pid`), String(pid));
  return { browser, pid };
}

async function closeBrowser(inst, { browser, pid }) {
  await browser.close().catch(() => {});
  if (pid && inst) fs.rmSync(path.join(RUNS, inst.id, `browser-${pid}.pid`), { force: true });
}

/** The app has rendered and the game loop has produced HUD stats. */
async function waitReady(page) {
  await page.waitForSelector('h1', { timeout: 15000 });
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent?.includes('The Library of Babel') && document.querySelector('[data-stat="pages"]')?.textContent?.trim(),
    { timeout: 15000 }
  );
}

// ─── launch ───────────────────────────────────────────────

async function launch() {
  const id = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
  const port = Number(flag('port', 0)) || (await freePort(5200));
  const dir = path.join(RUNS, id);
  fs.mkdirSync(dir, { recursive: true });
  const log = fs.openSync(path.join(dir, 'vite.log'), 'a');
  const vite = path.join(REPO, 'node_modules/vite/bin/vite.js');
  if (!fs.existsSync(vite)) die('node_modules/vite missing: run `npm install` in the repo root');

  const child = spawn(
    process.execPath,
    [vite, '--config', 'web/vite.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: REPO, detached: true, stdio: ['ignore', log, log] }
  );
  child.unref();
  const url = `http://127.0.0.1:${port}/`;
  const inst = { id, pid: child.pid, port, url, startedAt: new Date().toISOString(), gitRev: git('rev-parse', 'HEAD') };
  fs.writeFileSync(path.join(dir, 'instance.json'), JSON.stringify(inst, null, 2));

  const deadline = Date.now() + 30000;
  let served = false;
  while (Date.now() < deadline && alive(child.pid)) {
    const [index, entry] = await Promise.all([httpOk(url), httpOk(`${url}src/main.tsx`)]);
    if (index.ok && index.body.includes('id="root"') && entry.ok) {
      served = true;
      break;
    }
    await sleep(250);
  }
  if (!served) {
    console.error(fs.readFileSync(path.join(dir, 'vite.log'), 'utf8'));
    die(`vite did not come up on ${url} (run ${id}; clean up with \`node babel.mjs stop --run ${id}\`)`);
  }

  // Served is not usable: render the app in a real browser once
  const b = await openBrowser(inst);
  try {
    const page = await b.browser.newPage();
    await page.goto(url);
    await waitReady(page);
  } catch (err) {
    die(`app did not render at ${url}: ${err.message} (clean up with \`node babel.mjs stop --run ${id}\`)`);
  } finally {
    await closeBrowser(inst, b);
  }
  console.log(`ready  run=${id}  url=${url}  pid=${child.pid}`);
}

// ─── doctor ───────────────────────────────────────────────

async function doctor() {
  const inst = currentRun();
  const checks = [];
  const check = (ok, label, detail = '') => checks.push({ ok, line: `${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `: ${detail}` : ''}` });

  check(alive(inst.pid), 'vite process alive', `pid ${inst.pid}`);
  let owner = '';
  try {
    owner = execFileSync('ss', ['-ltnpH', `sport = :${inst.port}`], { encoding: 'utf8' });
  } catch {}
  check(owner.includes(`pid=${inst.pid},`), `port ${inst.port} owned by our pid`, owner.trim() || 'no listener');
  const index = await httpOk(inst.url);
  check(index.ok && index.body.includes('<title>The Library of Babel</title>'), 'serves the game', `HTTP ${index.status}`);
  const entry = await httpOk(`${inst.url}src/main.tsx`);
  check(entry.ok, 'app entry compiles', `HTTP ${entry.status}`);
  check(fs.existsSync(FIREFOX), 'firefox present', FIREFOX);

  const head = git('rev-parse', 'HEAD');
  const dirty = git('status', '--porcelain').split('\n').filter(Boolean).length;
  console.log(`run ${inst.id}  url ${inst.url}  started ${inst.startedAt}`);
  console.log(`code  HEAD ${head.slice(0, 7)}${head === inst.gitRev ? '' : ` (instance started at ${inst.gitRev.slice(0, 7)}; vite serves the working tree live)`}, ${dirty} uncommitted file(s)`);
  for (const c of checks) console.log(c.line);
  process.exit(checks.every(c => c.ok) ? 0 : 1);
}

// ─── run <journey> ────────────────────────────────────────

async function run() {
  const name = args[1];
  if (!name || name.startsWith('--')) die('usage: node babel.mjs run <journey> [--viewport desktop|mobile] [--run <id>]');
  const file = fs.existsSync(name) ? path.resolve(name) : path.join(SKILL, 'journeys', `${name}.mjs`);
  if (!fs.existsSync(file)) die(`no journey ${file}`);
  const journey = path.basename(file, '.mjs');
  const inst = currentRun();
  const viewportName = flag('viewport', 'desktop');
  const viewport = VIEWPORTS[viewportName] ?? die(`unknown viewport ${viewportName}`);
  const out = path.join(ARTIFACTS, inst.id, journey);
  fs.mkdirSync(out, { recursive: true });

  const transcript = [`# ${journey}`, '', `- run: ${inst.id}`, `- url: ${inst.url}`, `- viewport: ${viewportName} ${viewport.width}x${viewport.height}`, `- commit: ${git('rev-parse', 'HEAD')} (+${git('status', '--porcelain').split('\n').filter(Boolean).length} uncommitted)`, `- at: ${new Date().toISOString()}`, ''];
  const consoleLines = [];
  const b = await openBrowser(inst);
  const page = await b.browser.newPage();
  await page.setViewport(viewport);
  page.on('console', m => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => consoleLines.push(`[pageerror] ${e.message}`));

  let shots = 0;
  const ctx = {
    page,
    url: inst.url,
    out,
    /** Open the app (optionally at a hash like '#/library') and wait until it is usable. */
    async open(hash = '') {
      await page.goto(inst.url + hash);
      await waitReady(page);
    },
    /**
     * Precondition only: write a save into this browser's localStorage, then reload.
     * `save` is a fixture name from fixtures/ or a SaveFile object. savedAt is set to
     * now so no offline boost is banked, unless keepSavedAt is true.
     */
    async seed(save, { keepSavedAt = false } = {}) {
      const obj = typeof save === 'string' ? JSON.parse(fs.readFileSync(path.join(SKILL, 'fixtures', `${save}.json`), 'utf8')) : save;
      if (!keepSavedAt) obj.savedAt = Date.now();
      await ctx.seedRaw(JSON.stringify(obj));
    },
    /** Precondition only: put a raw string in the save slot (e.g. a corrupt save), then reload. */
    async seedRaw(raw) {
      // Write from a non-app document on the same origin: a running game saves itself on
      // pagehide, which would overwrite a seed written from inside the app.
      await page.goto(`${inst.url}src/main.tsx`);
      await page.evaluate((k, v) => localStorage.setItem(k, v), SAVE_KEY, raw);
      await page.goto(inst.url);
      await waitReady(page);
    },
    /** Record one user action and what it produced. */
    async step(label, fn) {
      transcript.push(`## ${label}`);
      const result = await fn();
      if (result !== undefined) transcript.push('', '```', typeof result === 'string' ? result : JSON.stringify(result, null, 2), '```');
      transcript.push('');
      return result;
    },
    async shot(label) {
      const file = `${String(++shots).padStart(2, '0')}-${label}.png`;
      await page.screenshot({ path: path.join(out, file) });
      transcript.push(`![${label}](${file})`, '');
    },
    /** Trimmed textContent of the first match, or null. */
    text: sel => page.evaluate(s => document.querySelector(s)?.textContent?.trim() ?? null, sel),
    /** Is the first match rendered (not display:none up its ancestry)? */
    visible: sel => page.evaluate(s => !!document.querySelector(s)?.checkVisibility(), sel),
    hash: () => page.evaluate(() => location.hash),
    /** Click a tab in the tab bar (e.g. 'settings' for Save) and wait until it is current. */
    async tab(id) {
      await page.click(`button[data-tab="${id}"]`);
      await page.waitForFunction(i => document.querySelector(`button[data-tab="${i}"]`)?.getAttribute('aria-current') === 'page', { timeout: 8000 }, id);
    },
    /** Parsed localStorage value for `key` (default: the save slot). */
    stored: (key = SAVE_KEY) => page.evaluate(k => {
      const v = localStorage.getItem(k);
      try { return JSON.parse(v); } catch { return v; }
    }, key),
    /** HUD numbers as the player sees them. */
    hud: () => page.evaluate(() => Object.fromEntries(['pages', 'money', 'pps', 'output'].map(s => [s, document.querySelector(`[data-stat="${s}"]`)?.textContent?.trim().replace(/\s+/g, ' ')]))),
    /** Poll until fn(page-side) is truthy. */
    waitFor: (fn, label, timeout = 8000, ...fnArgs) => page.waitForFunction(fn, { timeout }, ...fnArgs).catch(() => { throw new Error(`timed out waiting for: ${label}`); }),
    expect(cond, msg) {
      transcript.push(`- ${cond ? 'PASS' : 'FAIL'}: ${msg}`);
      if (!cond) throw new Error(`expectation failed: ${msg}`);
    },
  };

  let failed = null;
  try {
    const mod = await import(pathToFileURL(file).href);
    await mod.default(ctx);
  } catch (err) {
    failed = err;
    transcript.push('', `**FAILED:** ${err.message}`, '');
    await ctx.shot('failure').catch(() => {});
  } finally {
    fs.writeFileSync(path.join(out, 'console.log'), consoleLines.join('\n') + '\n');
    const errors = consoleLines.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]'));
    transcript.push(`Console: ${consoleLines.length} line(s), ${errors.length} error(s) (console.log)`);
    for (const e of errors) transcript.push(`    ${e}`);
    transcript.push('', `RESULT: ${failed ? 'FAIL' : 'PASS'}`, '');
    fs.writeFileSync(path.join(out, 'transcript.md'), transcript.join('\n'));
    await closeBrowser(inst, b);
  }
  console.log(`${failed ? 'FAIL' : 'PASS'}  ${journey}  evidence: ${path.relative(REPO, out)}/transcript.md`);
  if (failed) {
    console.error(failed.message);
    process.exit(1);
  }
}

// ─── stop ─────────────────────────────────────────────────

async function stopOne(inst) {
  const dir = path.join(RUNS, inst.id);
  // Only what this harness started: the vite process group, and browsers recorded by pid
  for (const f of fs.readdirSync(dir).filter(f => /^browser-\d+\.pid$/.test(f))) {
    const pid = Number(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (alive(pid)) process.kill(pid, 'SIGKILL');
  }
  if (alive(inst.pid)) {
    try { process.kill(-inst.pid, 'SIGTERM'); } catch {}
    for (let i = 0; i < 20 && alive(inst.pid); i++) await sleep(100);
    if (alive(inst.pid)) try { process.kill(-inst.pid, 'SIGKILL'); } catch {}
  }
  fs.rmSync(dir, { recursive: true, force: true });
  const evidence = path.join(ARTIFACTS, inst.id);
  console.log(`stopped ${inst.id}${fs.existsSync(evidence) ? `  evidence kept: ${path.relative(REPO, evidence)}` : ''}`);
}

async function stop() {
  if (args.includes('--all')) for (const id of runDirs()) await stopOne(readInstance(id));
  else await stopOne(currentRun());
}

function list() {
  const all = runDirs();
  if (!all.length) console.log('no instances');
  for (const id of all) {
    const i = readInstance(id);
    console.log(`${id}  ${i.url}  pid ${i.pid} ${alive(i.pid) ? 'alive' : 'DEAD'}`);
  }
}

const commands = { launch, doctor, run, stop, list };
if (!commands[cmd]) die('usage: node babel.mjs launch|doctor|run <journey>|stop [--all]|list');
await commands[cmd]();
