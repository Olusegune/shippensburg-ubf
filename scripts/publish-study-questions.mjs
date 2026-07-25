// Extracts real body text for draft "study-questions" resources (short, factual
// worksheet content — same treatment already applied to the 9-step series) and
// flips them to status: published. "message" and "article" entries are left
// untouched — those get manual review before publishing, per dev_spec.md.
//
// Usage: node scripts/publish-study-questions.mjs

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

  let published = 0;
  let skippedNotQuestions = 0;
  let skippedAlreadyPublished = 0;
  const needsReview = [];

  for (const file of files) {
    const path = join(RESOURCES_DIR, file);
    const raw = readFileSync(path, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { data, body } = parsed;

    if (data.resourceType !== 'study-questions') {
      skippedNotQuestions += 1;
      continue;
    }
    if (data.status !== 'draft') {
      skippedAlreadyPublished += 1;
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

    data.status = 'published';
    const newBody = `\n${text}\n`;
    writeFileSync(path, serialize(data, newBody));
    published += 1;
  }

  console.log(`Published ${published} study-questions resources.`);
  console.log(`Skipped ${skippedNotQuestions} non-question resources, ${skippedAlreadyPublished} already published.`);
  console.log(`${needsReview.length} flagged for manual review:`);
  const byReason = {};
  for (const r of needsReview) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
  console.log(byReason);

  if (needsReview.length > 0) {
    writeFileSync(
      join(ROOT, 'migration', 'needs-review.csv'),
      ['file,reason', ...needsReview.map((r) => `${r.file},"${r.reason}"`)].join('\n'),
    );
  }
}

main();
