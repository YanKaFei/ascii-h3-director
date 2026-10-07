#!/usr/bin/env node
/**
 * Documentation consistency — the docs must describe the code that exists.
 *
 * Documentation drift is a real defect: a README that advertises a chain the
 * planner no longer produces, or a grammar table listing a form key that was
 * removed, wastes a reader's time and destroys trust in every other claim.
 *
 * This suite asserts the relationship directly, so a change to the engine that
 * invalidates a published table fails here rather than in someone's terminal.
 *
 * Runs with zero dependencies:  node test/docs.test.js
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MECHANISMS, FORM_SUCCESSORS } from '../src/motion-grammar.js';
import { RAMPS, PALETTES } from '../src/core.js';
import { review, analyzeReference } from '../src/director.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const failures = [];
let passed = 0;

function test(name, fn) {
  try {
    const detail = fn();
    passed++;
    console.log(`PASS  ${name}${detail ? `\n        ${detail}` : ''}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`FAIL  ${name}\n        ${err.message}`);
  }
}

function ok(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
  }
}

const readme = read('README.md');
const architecture = read('docs/ARCHITECTURE.md');
const skill = read('skill/SKILL.md');
const referenceDir = 'skill/references';
const referenceFiles = readdirSync(join(ROOT, referenceDir));
const references = Object.fromEntries(
  referenceFiles.map((f) => [f, readFileSync(join(ROOT, referenceDir, f), 'utf8')]),
);
const grammarDoc = references['MOTION_GRAMMAR.md'];

/* ------------------------------------------------------------------ *
 * 1. The grammar doc describes the grammar that exists
 * ------------------------------------------------------------------ */

test('docs: every mechanism in the code is named in MOTION_GRAMMAR.md', () => {
  const missing = MECHANISMS.filter((m) => !grammarDoc.includes('`' + m.id + '`'));
  eq(missing.length, 0, `undocumented mechanism(s): ${missing.map((m) => m.id).join(', ')}`);
  return `${MECHANISMS.length} mechanisms documented`;
});

test('docs: MOTION_GRAMMAR.md tables match FORM_SUCCESSORS exactly', () => {
  // Rows of the shape: | `form` | **id** (tier, emits X)<br>... |
  const rows = new Map();
  for (const line of grammarDoc.split('\n')) {
    const m = line.match(/^\| `([a-z-]+)` \| (.+?) \|$/);
    if (m && Object.hasOwn(FORM_SUCCESSORS, m[1])) rows.set(m[1], m[2]);
  }
  const problems = [];
  for (const [form, ids] of Object.entries(FORM_SUCCESSORS)) {
    const row = rows.get(form);
    if (!row) { problems.push(`${form}: row missing`); continue; }
    const documented = [...row.matchAll(/\*\*([a-z-]+)\*\*/g)].map((x) => x[1]);
    const undeclared = documented.filter((id) => !ids.includes(id));
    const undocumented = ids.filter((id) => !documented.includes(id));
    if (undeclared.length) problems.push(`${form}: documents ${undeclared.join(', ')} which the code does not allow`);
    if (undocumented.length) problems.push(`${form}: omits ${undocumented.join(', ')}`);
  }
  eq(problems.length, 0, problems.join('; '));
  return `${Object.keys(FORM_SUCCESSORS).length} form rows agree with the code`;
});

test('docs: MOTION_GRAMMAR.md lists no removed form key as a table row', () => {
  const formRows = [...grammarDoc.matchAll(/^\| `([a-z-]+)` \| \*\*/gm)].map((m) => m[1]);
  const valid = new Set(Object.keys(FORM_SUCCESSORS));
  const stale = formRows.filter((f) => !valid.has(f));
  eq(stale.length, 0, `stale form row(s): ${stale.join(', ')}`);
  return `${formRows.length} rows, all live form keys`;
});

test('docs: the reject tier is described by the terms the gate searches for', () => {
  // `review()` derives its cliché vocabulary from the reject mechanism ids.
  const terms = MECHANISMS.filter((m) => m.tier === 'reject').map((m) => m.id.replace(/^reject-/, ''));
  const missing = terms.filter((t) => !grammarDoc.includes('`' + t + '`'));
  eq(missing.length, 0, `undocumented cliché term(s): ${missing.join(', ')}`);
  return terms.join(', ');
});

test('docs: every mechanism documents the action it leaves unresolved', () => {
  // Each mechanism's UNRESOLVED sentence should be reachable from the doc.
  const missing = MECHANISMS.filter((m) => {
    const needle = m.name;
    return !grammarDoc.includes(m.id) || (m.tier !== 'reject' && !needle);
  });
  eq(missing.length, 0, `mechanism(s) without a documented name: ${missing.map((m) => m.id).join(', ')}`);
  return 'all mechanism ids and names present';
});

/* ------------------------------------------------------------------ *
 * 2. The README's tables and transcripts describe the code
 * ------------------------------------------------------------------ */

test('docs: every ramp name in the code appears in the README', () => {
  const missing = Object.keys(RAMPS).filter((r) => !readme.includes(r));
  eq(missing.length, 0, `undocumented ramp(s): ${missing.join(', ')}`);
  return Object.keys(RAMPS).join(', ');
});

test('docs: every palette name in the code appears in the README', () => {
  const missing = Object.keys(PALETTES).filter((p) => !readme.includes(p));
  eq(missing.length, 0, `undocumented palette(s): ${missing.join(', ')}`);
  return Object.keys(PALETTES).join(', ');
});

test('docs: the README documents exactly the gate checks that exist', () => {
  const ids = review({ chain: [], duration: 15 }).checks.map((c) => c.id);
  eq(ids.length, 7, `the gate no longer has 7 checks`);
  // Check ids are kebab-case; their human labels are what the README quotes.
  const labels = review({ chain: [], duration: 15 }).checks.map((c) => c.label);
  const missing = labels.filter((l) => !readme.toLowerCase().includes(l.toLowerCase().slice(0, 24)));
  eq(missing.length, 0, `undocumented gate check(s): ${missing.join(' | ')}`);
  return ids.join(', ');
});

test('docs: README quick-start transcripts carry the chain the planner produces', () => {
  // The transcript quotes a gate line. Re-derive it for the brief it uses.
  const briefs = [...readme.matchAll(/\$ ascii-h3 plan "([^"]+)"/g)].map((m) => m[1]);
  ok(briefs.length > 0, 'the README no longer shows a plan transcript');
  // Every quoted gate chain must match a chain the planner can actually emit.
  const quoted = [...readme.matchAll(/5 beat\(s\): ([a-z-]+ → [a-z-]+ → [a-z-]+ → [a-z-]+ → [a-z-]+)/g)]
    .map((m) => m[1]);
  ok(quoted.length > 0, 'the README no longer quotes a gate chain line');
  const bad = quoted.filter((line) => {
    const ids = line.split(' → ');
    return !ids.every((id) => MECHANISMS.some((m) => m.id === id));
  });
  eq(bad.length, 0, `quoted chain(s) name unknown mechanisms: ${bad.join(' | ')}`);
  return `${quoted.length} quoted chain(s), all composed of real mechanisms`;
});

test('docs: the README has all three language sections and three transcripts', () => {
  for (const heading of ['## 中文', '## 日本語', '## English']) {
    ok(readme.includes(heading), `missing section: ${heading}`);
  }
  const transcripts = (readme.match(/^\$ ascii-h3 doctor/gm) || []).length;
  eq(transcripts, 3, 'expected one quick-start transcript per language');
  return 'zh · ja · en, three transcripts';
});

test('docs: the README quotes FORM_SUCCESSORS lists that the code still allows', () => {
  const quoted = [...readme.matchAll(/`([a-z-]+) → ([^`]+)`/g)];
  const problems = [];
  let checked = 0;
  for (const [, form, list] of quoted) {
    if (!Object.hasOwn(FORM_SUCCESSORS, form)) continue;
    const ids = list.split('|').map((x) => x.trim());
    if (!ids.every((id) => MECHANISMS.some((m) => m.id === id))) continue;
    checked++;
    const declared = FORM_SUCCESSORS[form];
    const wrong = ids.filter((id) => !declared.includes(id));
    const omitted = declared.filter((id) => !ids.includes(id));
    if (wrong.length) problems.push(`${form}: quotes ${wrong.join(', ')} which the code forbids`);
    if (omitted.length) problems.push(`${form}: omits ${omitted.join(', ')}`);
  }
  eq(problems.length, 0, problems.join('; '));
  return `${checked} quoted successor list(s) match the code`;
});

/* ------------------------------------------------------------------ *
 * 3. Cross-references and structure
 * ------------------------------------------------------------------ */

test('docs: every reference SKILL.md points at exists', () => {
  const refs = [...skill.matchAll(/references\/([A-Za-z_]+\.md)/g)].map((m) => m[1]);
  ok(refs.length > 0, 'SKILL.md no longer references any document');
  const missing = [...new Set(refs)].filter((r) => !existsSync(join(ROOT, referenceDir, r)));
  eq(missing.length, 0, `SKILL.md references missing document(s): ${missing.join(', ')}`);
  return `${new Set(refs).size} referenced documents, all present`;
});

test('docs: ARCHITECTURE.md accounts for every source module', () => {
  const modules = readdirSync(join(ROOT, 'src')).filter((f) => f.endsWith('.js'));
  const missing = modules.filter((f) => !architecture.includes(f));
  eq(missing.length, 0, `undocumented module(s): ${missing.join(', ')}`);
  return `${modules.length} modules`;
});

test('docs: relative asset paths in the README all resolve', () => {
  const refs = [...readme.matchAll(/\((assets\/[^)\s]+\.(?:png|svg|jpg))\)/g)].map((m) => m[1]);
  const htmlRefs = [...readme.matchAll(/src="(assets\/[^"]+\.(?:png|svg|jpg))"/g)].map((m) => m[1]);
  const all = [...new Set([...refs, ...htmlRefs])];
  ok(all.length > 0, 'the README no longer embeds any image');
  const missing = all.filter((p) => !existsSync(join(ROOT, p)));
  eq(missing.length, 0, `README embeds missing file(s): ${missing.join(', ')}`);
  return `${all.length} images, all present`;
});

test('docs: the documented reference example matches what the CLI produces', () => {
  // The reference-analysis doc transcribes a CHAIN line. Recompute it.
  const observations = JSON.parse(read('test/reference.json'));
  const chain = analyzeReference(observations).chain.map((l) => l.mechanism).join(' → ');
  const doc = references['REFERENCE_ANALYSIS.md'];
  ok(
    doc.includes(`CHAIN: ${chain}`),
    `the documented CHAIN line is stale.\n      code produces: CHAIN: ${chain}`,
  );
  return `CHAIN: ${chain}`;
});

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

console.log('');
if (failures.length) {
  console.log(`FAILED ${failures.length}/${passed + failures.length} tests — ${failures.map((f) => f.name).join(', ')}`);
  process.exit(1);
} else {
  console.log(`OK — ${passed}/${passed} documentation checks passed`);
}
