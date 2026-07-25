// Extracts body text for draft "message" resources so a human reviewer can read
// them in place instead of opening each original file — but does NOT flip status
// to published. Messages are longer, more clearly authored prose (sermon-style),
// so they get a human read before going live, unlike the study-questions worksheets.
//
// Usage: node scripts/extract-messages-for-review.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import YAML from 'yaml';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESOURCES_DIR = join(ROOT, 'src', 'content', 'resources');
const PUBLIC_DIR = join(ROOT, 'public');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return { data: YAML.parse(match[1]), body: match[2] };
}

function serialize(data, body) {
  const yamlText = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yamlText}\n---\n${body}`;
}

function cleanText(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

async function extractPdf(path) {
  const buffer = readFileSync(path);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return cleanText(result.text);
}

function extractDoc(path) {
  const out = execFileSync('antiword', [path], { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 });
  return cleanText(out);
}

function garbledRatio(text) {
  if (text.length === 0) return 1;
  const bad = text.replace(/[\x20-\x7E\n‘’“”–—]/g, '');
  return bad.length / text.length;
}

async function main() {
  const files = readdirSync(RESOURCES_DIR).filter((f) => f.endsWith('.md'));

  let extracted = 0;
  let skippedNotMessages = 0;
  let skippedAlreadyDone = 0;
  const needsReview = [];

  for (const file of files) {
    const path = join(RESOURCES_DIR, file);
    const raw = readFileSync(path, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { data, body } = parsed;

    if (data.resourceType !== 'message') {
      skippedNotMessages += 1;
      continue;
    }
    if (data.status !== 'draft') {
      skippedAlreadyDone += 1;
      continue;
    }
    // Already has extracted body (nine-step messages are placeholder-only; skip
    // anything whose body isn't just the standard placeholder link block).
    if (!body.includes('_Imported from the legacy site') && !body.includes('_Message content pending manual review')) {
      skippedAlreadyDone += 1;
      continue;
    }
    if (!data.pdf) {
      needsReview.push({ file, reason: 'no file reference' });
      continue;
    }

    const relPath = data.pdf.replace(/^\//, '');
    const srcPath = join(PUBLIC_DIR, relPath);
    if (!existsSync(srcPath)) {
      needsReview.push({ file, reason: 'source file missing' });
      continue;
    }

    let text;
    try {
      const ext = extname(srcPath).toLowerCase();
      if (ext === '.pdf') {
        text = await extractPdf(srcPath);
      } else if (ext === '.doc') {
        text = extractDoc(srcPath);
      } else {
        needsReview.push({ file, reason: `unsupported extension ${ext}` });
        continue;
      }
    } catch (err) {
      needsReview.push({ file, reason: `extraction error: ${err.message.slice(0, 120)}` });
      continue;
    }

    if (text.length < 30) {
      needsReview.push({ file, reason: 'extracted text too short (possibly scanned or empty)' });
      continue;
    }
    if (garbledRatio(text) > 0.08) {
      needsReview.push({ file, reason: 'high ratio of non-printable characters (encoding issue)' });
      continue;
    }

    // Status stays "draft" — extraction just makes review possible without
    // opening the original file. A human still needs to flip status to publish.
    const reviewNote = '_Extracted from the legacy file for review. Status is still "draft" — a human ' +
      'needs to read this and flip status to "published" before it goes live._\n\n---\n';
    const newBody = `\n${reviewNote}\n${text}\n`;
    writeFileSync(path, serialize(data, newBody));
    extracted += 1;
  }

  console.log(`Extracted review-ready text for ${extracted} message resources (status still draft).`);
  console.log(`Skipped ${skippedNotMessages} non-message resources, ${skippedAlreadyDone} already processed.`);
  console.log(`${needsReview.length} flagged for manual review:`);
  const byReason = {};
  for (const r of needsReview) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
  console.log(byReason);

  if (needsReview.length > 0) {
    const existing = existsSync(join(ROOT, 'migration', 'needs-review.csv'))
      ? readFileSync(join(ROOT, 'migration', 'needs-review.csv'), 'utf-8').trim()
      : 'file,reason';
    const csv = [existing, ...needsReview.map((r) => `${r.file},"${r.reason}"`)].join('\n');
    writeFileSync(join(ROOT, 'migration', 'needs-review.csv'), csv);
  }
}

main();
