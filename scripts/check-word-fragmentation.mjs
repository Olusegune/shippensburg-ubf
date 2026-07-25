// Detects PDF-extraction glyph-spacing corruption: valid ASCII text where words
// get split by spurious mid-word spaces (e.g. a ligature/kerning bug). The
// earlier garbled-ratio check only flagged non-printable characters, so this
// class of corruption slipped through undetected.
//
// Heuristic: split the body into whitespace-separated tokens, strip punctuation,
// and measure what fraction of tokens are 1-2 letters long and NOT one of a
// small set of common short English words. A normal English paragraph runs
// ~8-15%; heavily fragmented text runs 30%+.
//
// Usage: node scripts/check-word-fragmentation.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESOURCES_DIR = join(ROOT, 'src', 'content', 'resources');

const COMMON_SHORT_WORDS = new Set([
  'a', 'i', 'to', 'of', 'in', 'on', 'at', 'is', 'it', 'be', 'as', 'an', 'or',
  'by', 'we', 'he', 'if', 'so', 'up', 'no', 'do', 'my', 'me', 'us', 'am', 'go',
  'ok', 'hi', 'oh',
]);

function fragmentationScore(text) {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z]/g, ''))
    .filter((t) => t.length > 0);
  if (tokens.length < 20) return { score: 0, tokenCount: tokens.length };
  const shortFragments = tokens.filter((t) => t.length <= 2 && !COMMON_SHORT_WORDS.has(t.toLowerCase()));
  return { score: shortFragments.length / tokens.length, tokenCount: tokens.length };
}

function main() {
  const files = readdirSync(RESOURCES_DIR).filter((f) => f.endsWith('.md'));
  const results = [];

  for (const file of files) {
    const raw = readFileSync(join(RESOURCES_DIR, file), 'utf-8');
    const bodyMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    if (!bodyMatch) continue;
    const body = bodyMatch[1];
    const { score, tokenCount } = fragmentationScore(body);
    if (tokenCount >= 20) {
      results.push({ file, score, tokenCount });
    }
  }

  results.sort((a, b) => b.score - a.score);

  const flagged = results.filter((r) => r.score > 0.15);
  console.log(`Scanned ${results.length} files with body content.`);
  console.log(`${flagged.length} files flagged with fragmentation score > 0.15:`);
  for (const r of flagged) {
    console.log(`  ${r.file}: ${(r.score * 100).toFixed(1)}% (${r.tokenCount} tokens)`);
  }

  console.log('\nScore distribution (top 20):');
  for (const r of results.slice(0, 20)) {
    console.log(`  ${r.file}: ${(r.score * 100).toFixed(1)}%`);
  }
}

main();
