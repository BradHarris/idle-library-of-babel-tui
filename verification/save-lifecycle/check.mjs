#!/usr/bin/env node
// Check the save-lifecycle model with TLC, regenerate its state graph, and replay
// every step of that graph against the real app (web/src/saveLifecycle.conformance.test.tsx).
//
//   node verification/save-lifecycle/check.mjs            # rules + graph + conformance
//   node verification/save-lifecycle/check.mjs --rules    # rules only
//
// Needs Java 11+ and tla2tools.jar 1.7.4 (sha256 below). It never downloads anything.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const SPEC = 'SaveLifecycle';
const RULES = ['TypeOK', 'NoSilentOverwrite', 'NoForeignOverwrite', 'NoFalseAlarm', 'WarnedSaveKept', 'BackupKept'];
const TLC_VERSION = '1.7.4';
const TLC_SHA256 = '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88';
const JAR = process.env.TLA2TOOLS || path.join(os.homedir(), '.cache/tla', `tla2tools-${TLC_VERSION}.jar`);
const JAVA = process.env.JAVA || 'java';

/**
 * Rules the current code is known to break, reported on every run but not failing it.
 * Each entry is a decision the user made; remove it when the code is fixed (the check
 * then says so). Never add one to make a new break pass.
 */
const KNOWN_FINDINGS = JSON.parse(fs.readFileSync(path.join(HERE, 'known-findings.json'), 'utf8'));

function ensureTlc() {
  if (!fs.existsSync(JAR)) {
    console.error(`TLC not found at ${JAR}. Install it once (or set TLA2TOOLS=/path/to/tla2tools.jar):\n` +
      `  mkdir -p ~/.cache/tla && curl -fsSLo ~/.cache/tla/tla2tools-${TLC_VERSION}.jar https://github.com/tlaplus/tlaplus/releases/download/v${TLC_VERSION}/tla2tools.jar`);
    process.exit(2);
  }
  const sha = crypto.createHash('sha256').update(fs.readFileSync(JAR)).digest('hex');
  if (sha !== TLC_SHA256) {
    console.error(`${JAR} has sha256 ${sha}, expected ${TLC_SHA256} (tla2tools ${TLC_VERSION}). Refusing to run it.`);
    process.exit(2);
  }
}

function tlc(dir, cfgText, extra = []) {
  fs.writeFileSync(path.join(dir, `${SPEC}.cfg`), cfgText);
  const r = spawnSync(JAVA, ['-XX:+UseParallelGC', '-cp', JAR, 'tlc2.TLC', '-workers', '1', '-config', `${SPEC}.cfg`, ...extra, `${SPEC}.tla`], { cwd: dir, encoding: 'utf8' });
  if (r.error) throw r.error;
  return r.stdout + r.stderr;
}

/** "/\ x = 1\n/\ y = "a"" -> { x: 1, y: "a" } */
function parseState(text) {
  const vars = {};
  for (const m of text.matchAll(/\/\\ (\w+) = (.+)/g)) {
    const raw = m[2].trim();
    vars[m[1]] = raw === 'TRUE' ? true : raw === 'FALSE' ? false : raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  return vars;
}

function parseTrace(out) {
  const steps = [];
  for (const m of out.matchAll(/State \d+: <(\w+)[^>]*>\n((?:\/\\ .+\n?)+)/g)) steps.push({ action: m[1] === 'Initial' ? 'Init' : m[1], vars: parseState(m[2]) });
  return steps;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'save-lifecycle-'));
for (const f of [`${SPEC}.tla`]) fs.copyFileSync(path.join(HERE, f), path.join(scratch, f));

ensureTlc();
let failed = false;

// 1. Each rule on its own, so every broken rule gets its own shortest counterexample
console.log(`TLC ${TLC_VERSION}: ${SPEC} (every ordering of the model's steps; the state space is finite, so no bound)`);
for (const rule of RULES) {
  const out = tlc(scratch, `SPECIFICATION Spec\nINVARIANT ${rule}\n`);
  const states = out.match(/(\d+) distinct states found/)?.[1];
  if (out.includes(`Invariant ${rule} is violated`)) {
    const trace = parseTrace(out);
    const known = KNOWN_FINDINGS[rule];
    console.log(`${known ? 'KNOWN' : 'BREAKS'}  ${rule}${known ? `  (${known})` : ''}`);
    for (const s of trace) console.log(`        ${s.action.padEnd(15)} slot=${s.vars.slot} backup=${s.vars.backup} open=${s.vars.open} loaded=${s.vars.loaded} enabled=${s.vars.enabled} foreign=${s.vars.foreign} halted=${s.vars.halted}`);
    if (!known) failed = true;
  } else if (/No error has been found/.test(out)) {
    console.log(`holds   ${rule}  (${states} distinct states)`);
    if (KNOWN_FINDINGS[rule]) console.log(`        ${rule} is listed in known-findings.json but now holds: remove it from there.`);
  } else {
    console.log(`ERROR   ${rule}: TLC did not finish\n${out}`);
    failed = true;
  }
}
if (process.argv.includes('--rules')) process.exit(failed ? 1 : 0);

// 2. The full state graph (no rule stops it early), written for the conformance test
const out = tlc(scratch, 'SPECIFICATION Spec\nINVARIANT TypeOK\n', ['-dump', 'dot,actionlabels', 'graph.dot']);
if (!/No error has been found/.test(out)) {
  console.log(`ERROR   graph dump failed\n${out}`);
  process.exit(1);
}
const dot = fs.readFileSync(path.join(scratch, 'graph.dot'), 'utf8');
const nodes = new Map();
const initIds = new Set();
for (const m of dot.matchAll(/^(-?\d+) \[label="((?:[^"\\]|\\.)*)"(.*)\]/gm)) {
  const label = m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  nodes.set(m[1], parseState(label));
  if (/style\s*=\s*filled/.test(m[3])) initIds.add(m[1]);
}
const rawEdges = [...dot.matchAll(/^(-?\d+) -> (-?\d+) \[label="(\w+)"/gm)].map(m => ({ from: m[1], to: m[2], action: m[3] }));

// Stable ids from the state's values, so graph.json only changes when the model does
const key = v => Object.keys(v).sort().map(k => `${k}=${v[k]}`).join(' ');
const sorted = [...nodes.entries()].sort((a, b) => key(a[1]).localeCompare(key(b[1])));
const id = new Map(sorted.map(([raw], i) => [raw, `s${i}`]));
const graph = {
  generatedBy: `verification/save-lifecycle/check.mjs (TLC ${TLC_VERSION})`,
  states: Object.fromEntries(sorted.map(([raw, v]) => [id.get(raw), v])),
  init: [...initIds].map(r => id.get(r)).sort(),
  edges: rawEdges
    .map(e => ({ from: id.get(e.from), action: e.action, to: id.get(e.to) }))
    .sort((a, b) => `${a.from} ${a.action} ${a.to}`.localeCompare(`${b.from} ${b.action} ${b.to}`)),
};
if (!graph.init.length || graph.edges.some(e => !e.from || !e.to)) {
  console.log('ERROR   could not parse TLC\'s graph dump (format changed?)');
  process.exit(1);
}
const graphFile = path.join(HERE, 'graph.json');
const next = JSON.stringify(graph, null, 2) + '\n';
const changed = !fs.existsSync(graphFile) || fs.readFileSync(graphFile, 'utf8') !== next;
fs.writeFileSync(graphFile, next);
console.log(`graph   ${Object.keys(graph.states).length} states, ${graph.edges.length} steps, ${graph.init.length} start states${changed ? '  (graph.json changed: commit it)' : ''}`);

// 3. Replay every step against the real app
console.log('replay  every model step against <App/> in jsdom (vitest)');
const vitest = spawnSync('npx', ['vitest', 'run', '--config', 'web/vite.config.ts', 'web/src/saveLifecycle.conformance.test.tsx'], { cwd: REPO, encoding: 'utf8' });
const lines = (vitest.stdout + vitest.stderr).split('\n');
console.log(lines.find(l => /^\s*Tests /.test(l)) ?? lines.slice(-20).join('\n'));
const failures = lines.filter(l => /^ FAIL .*>/.test(l)).map(l => `        ${l.replace(/.*> /, '')}`);
if (failures.length) console.log(`${failures.slice(0, 10).join('\n')}${failures.length > 10 ? `\n        … ${failures.length - 10} more` : ''}\n        full output: npx vitest run --config web/vite.config.ts web/src/saveLifecycle.conformance.test.tsx`);
if (vitest.status !== 0) failed = true;

fs.rmSync(scratch, { recursive: true, force: true });
console.log(failed ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(failed ? 1 : 0);
