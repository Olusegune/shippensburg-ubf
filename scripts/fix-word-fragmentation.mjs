// Repairs the 12 message files whose source PDFs encode justified-text spacing
// in a way that both pdf-parse and pdftotext misread (words either fragmented
// with spurious spaces, or run together with none). Strategy:
//   1. Re-extract with pdftotext (default mode), which mostly drops spaces
//      between certain words rather than inserting them — a more tractable
//      defect to repair than pdf-parse's fragmented-word output.
//   2. Split each run-together chunk at lower->UPPER case boundaries first
//      (recovers sentence starts and ALL-CAPS words like "LORD" cleanly).
//   3. Dictionary-segment (DP, minimize word count) any remaining
//      case-uniform chunk that isn't already a valid word, preserving case.
//
// Files that don't fully segment cleanly are left flagged for manual review
// rather than silently guessing.
//
// Usage: node scripts/fix-word-fragmentation.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ENGLISH_WORDS = require('an-array-of-english-words');

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESOURCES_DIR = join(ROOT, 'src', 'content', 'resources');
const PUBLIC_DIR = join(ROOT, 'public');

const FILES = [
  'hosea-ch1-mm.md', 'hosea-ch2-mm.md', 'hosea-ch3-mm.md',
  'hosea-ch4-mm.md', 'hosea-ch5-mm.md', 'hosea-ch6-mm.md',
  'judges-ch1-mm.md', 'judges-ch2-mm.md', 'judges-ch3-mm.md',
  'judges-ch4-mm.md', 'judges-ch5-mm.md', 'judges-ch6-mm.md',
];

const DICT = new Set(ENGLISH_WORDS.map((w) => w.toLowerCase()));
// Biblical/proper-noun vocabulary not in a general English dictionary.
const EXTRA_WORDS = [
  'lord', 'god', 'jesus', 'christ', 'israel', 'israelites', 'hosea', 'gomer',
  'judges', 'israelite', 'canaanites', 'philistines', 'moabites', 'midianites',
  'jephthah', 'deborah', 'barak', 'gideon', 'samson', 'ephraim', 'baal',
  'jabin', 'sisera', 'ammonites', 'jerubbaal', 'succoth', 'penuel', 'ophrah',
];
for (const w of EXTRA_WORDS) DICT.add(w);

const MAX_WORD_LEN = 18;
const MIN_CHUNK_LEN = 10; // only attempt segmentation on chunks at least this long

function isWord(w) {
  return DICT.has(w.toLowerCase());
}

// DP word-break minimizing segment count; returns null if no full segmentation found.
function segment(chunk) {
  const lower = chunk.toLowerCase();
  const n = lower.length;
  const dp = new Array(n + 1).fill(Infinity);
  const choice = new Array(n + 1).fill(-1);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    const start = Math.max(0, i - MAX_WORD_LEN);
    for (let j = start; j < i; j++) {
      if (dp[j] === Infinity) continue;
      const word = lower.slice(j, i);
      if (word.length === 1 && !['a', 'i'].includes(word)) continue;
      if (isWord(word) && dp[j] + 1 < dp[i]) {
        dp[i] = dp[j] + 1;
        choice[i] = j;
      }
    }
  }
  if (dp[n] === Infinity) return null;
  const words = [];
  let i = n;
  while (i > 0) {
    const j = choice[i];
    words.unshift(chunk.slice(j, i));
    i = j;
  }
  return words;
}

// Split a run-together token into case-transition chunks, then dictionary-segment
// any chunk that isn't already a clean dictionary word.
function repairToken(token) {
  if (token.length < MIN_CHUNK_LEN || isWord(token)) return token;
  if (!/^[A-Za-z']+$/.test(token)) return token;

  // Split at lower->UPPER boundaries (camel-case style), keeping runs of
  // consecutive uppercase letters together (e.g. "LORD").
  const caseChunks = [];
  let current = token[0];
  for (let i = 1; i < token.length; i++) {
    const prev = token[i - 1];
    const ch = token[i];
    const boundary = /[a-z']/.test(prev) && /[A-Z]/.test(ch);
    if (boundary) {
      caseChunks.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  caseChunks.push(current);

  const repairedChunks = caseChunks.map((chunk) => {
    if (chunk.length < MIN_CHUNK_LEN || isWord(chunk)) return chunk;
    const words = segment(chunk);
    if (!words) return null; // signal failure
    return words.join(' ');
  });

  if (repairedChunks.includes(null)) return null;
  return repairedChunks.join(' ');
}

function repairText(text) {
  const tokens = text.split(/(\s+)/); // keep whitespace separators
  let failures = 0;
  const repaired = tokens.map((tok) => {
    if (/^\s+$/.test(tok) || tok.length === 0) return tok;
    // Strip leading/trailing punctuation, repair the core, reattach punctuation.
    const m = tok.match(/^([^A-Za-z]*)([A-Za-z']+)([^A-Za-z]*)$/);
    if (!m) return tok;
    const [, lead, core, trail] = m;
    const result = repairToken(core);
    if (result === null) {
      failures += 1;
      return tok; // leave original on failure
    }
    return lead + result + trail;
  });
  return { text: repaired.join(''), failures };
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return { data: YAML.parse(match[1]), body: match[2] };
}

function serialize(data, body) {
  const yamlText = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yamlText}\n---\n${body}`;
}

function main() {
  const report = [];

  for (const file of FILES) {
    const path = join(RESOURCES_DIR, file);
    const raw = readFileSync(path, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { data } = parsed;

    const relPath = data.pdf.replace(/^\//, '');
    const srcPath = join(PUBLIC_DIR, relPath);
    if (!existsSync(srcPath)) {
      report.push({ file, status: 'source missing' });
      continue;
    }

    const rawText = execFileSync('pdftotext', [srcPath, '-'], { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 });
    const cleaned = rawText
      .replace(/\r/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
      .join('\n')
      .trim();

    const { text: repairedText, failures } = repairText(cleaned);

    const reviewNote = failures > 0
      ? `_Extracted from the legacy file for review (word-segmentation repair applied; ` +
        `${failures} token(s) could not be confidently segmented and are left as-is — check ` +
        `manually). Status is still "draft" — a human needs to read this and flip status to ` +
        `"published" before it goes live._\n\n---\n`
      : '_Extracted from the legacy file for review (word-segmentation repair applied). ' +
        'Status is still "draft" — a human needs to read this and flip status to "published" ' +
        'before it goes live._\n\n---\n';

    const newBody = `\n${reviewNote}\n${repairedText}\n`;
    writeFileSync(path, serialize(data, newBody));
    report.push({ file, status: 'repaired', failures });
  }

  console.log('Repair report:');
  for (const r of report) {
    console.log(`  ${r.file}: ${r.status}${'failures' in r ? ` (${r.failures} unsegmented tokens)` : ''}`);
  }
}

main();
