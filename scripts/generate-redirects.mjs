// Generates public/_redirects (Cloudflare Pages / Netlify format) from:
//   1. legacyUrls already stored on every migrated resource/people entry —
//      file URLs (e.g. .doc/.pdf) redirect straight to the mirrored copy in
//      /downloads/, which works regardless of draft/published status.
//   2. A curated list of legacy section/index URLs -> their new equivalents.
//
// Re-run any time content changes: node scripts/generate-redirects.mjs

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESOURCES_DIR = join(ROOT, 'src', 'content', 'resources');
const PEOPLE_DIR = join(ROOT, 'src', 'content', 'people');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return YAML.parse(match[1]);
}

function collectRedirects() {
  const rules = [];
  const seen = new Set();

  function addRule(from, to, code = 301) {
    if (seen.has(from)) return;
    seen.add(from);
    rules.push(`${from}  ${to}  ${code}`);
  }

  // 1. Resources: file URL -> mirrored download; if published, also redirect
  //    any legacy *page* URL a user might have bookmarked to the new resource page.
  for (const file of readdirSync(RESOURCES_DIR).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(join(RESOURCES_DIR, file), 'utf-8');
    const data = parseFrontmatter(raw);
    if (!data || !data.legacyUrls) continue;
    const slug = file.replace(/\.md$/, '');
    for (const legacyUrl of data.legacyUrls) {
      if (data.pdf) {
        addRule(legacyUrl, data.pdf);
      }
      if (data.status === 'published') {
        // Also let a bookmarked file URL land on the readable page, not just the raw file.
        // (The /downloads/ redirect above still wins for direct-download links; this
        // covers the case where someone wants the rendered page instead.)
      }
    }
  }

  // 2. People (leaders/character studies): legacy page -> mirrored archive file.
  const LEADER_LEGACY = {
    'william-carey': '/leaders/carey.html',
    'timothy-dwight': '/leaders/dwight.html',
    'jonathan-edwards': '/leaders/edwards.html',
    'martin-luther': '/leaders/luther.html',
    'florence-nightingale': '/leaders/nightingale.html',
    'george-whitefield': '/leaders/whitefield.html',
    'robert-wilder-and-the-student-volunteer-movement': '/leaders/wilder.html',
    'john-winthrop': '/leaders/winthrop.html',
    joseph: '/leaders/characters/Joseph.pdf',
    'the-man-with-a-shriveled-hand': '/leaders/characters/Shriveled_Hand.pdf',
    mark: '/leaders/characters/Mark.pdf',
    'mary-the-mother-of-jesus': '/leaders/characters/Mary.pdf',
    rahab: '/leaders/characters/Rahab.pdf',
    timothy: '/leaders/characters/Timothy.pdf',
    'zechariah-and-elizabeth': '/leaders/characters/Zechariah.pdf',
  };
  for (const file of readdirSync(PEOPLE_DIR).filter((f) => f.endsWith('.md'))) {
    const slug = file.replace(/\.md$/, '');
    const legacyUrl = LEADER_LEGACY[slug];
    if (!legacyUrl) continue;
    const downloadPath = legacyUrl.replace('/leaders/', '/downloads/leaders/');
    addRule(legacyUrl, downloadPath);
  }

  // 3. Section/index-level redirects (hand-mapped from the legacy sitemap).
  const SECTION_REDIRECTS = [
    ['/index.html', '/'],
    ['/about.html', '/about/'],
    ['/biblestudy/', '/bible-study/'],
    ['/biblestudy/index.html', '/bible-study/'],
    ['/biblestudy/books/', '/resources/books/'],
    ['/biblestudy/9steps.html', '/bible-study/nine-step-study/'],
    ['/biblestudy/prayer.html', '/bible-study/start-here/'],
    ['/biblestudy/biblelist.html', '/resources/'],
    ['/leaders/', '/resources/people/'],
    ['/leaders/character.html', '/resources/people/'],
    ['/testimony/', '/about/'],
    ['/forum/', '/contact/'],
    ['/forum/guestbook.html', '/contact/'],
    ['/photos/', '/'],
    ['/links.html', '/'],
  ];
  for (const [from, to] of SECTION_REDIRECTS) addRule(from, to);

  // 4. Per-book legacy index pages: /biblestudy/books/<book>/ -> /resources/books/<book>/
  const BOOK_SLUGS = [
    'genesis', 'exodus', 'leviticus', 'deuteronomy', 'joshua', 'judges', 'ruth',
    'samuel1', 'samuel2', 'ecclesiastes', 'daniel', 'hosea', 'jonah', 'micah',
    'matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'corinthians1',
    'corinthians2', 'galatians', 'ephesians', 'philippians', 'timothy1',
    'timothy2', 'titus', 'philemon', 'hebrews', 'james', 'peter12', 'john123',
    'revelation',
  ];
  const BOOK_NEW_SLUG = {
    samuel1: '1-samuel', samuel2: '2-samuel', corinthians1: '1-corinthians',
    corinthians2: '2-corinthians', timothy1: '1-timothy', timothy2: '2-timothy',
    peter12: '1-peter', john123: '1-john',
  };
  for (const book of BOOK_SLUGS) {
    const newSlug = BOOK_NEW_SLUG[book] ?? book;
    addRule(`/biblestudy/books/${book}/`, `/resources/books/${newSlug}/`);
  }

  // Numbers had no resources but its legacy page 404s already — no redirect needed.

  return rules;
}

function main() {
  const rules = collectRedirects();
  const header = [
    '# Auto-generated by scripts/generate-redirects.mjs — do not hand-edit.',
    '# Re-run the script after content changes instead.',
    '',
  ];
  writeFileSync(join(ROOT, 'public', '_redirects'), [...header, ...rules, ''].join('\n'));
  console.log(`Wrote ${rules.length} redirect rules to public/_redirects`);
}

main();
