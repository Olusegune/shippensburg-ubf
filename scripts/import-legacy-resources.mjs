// Imports the legacy ship-ubf.org book-study files (downloaded to migration/downloads/)
// into src/content/resources/ entries + public/downloads/ files.
//
// This script parses filenames only — it does not extract document body text.
// Each generated resource is marked status: "draft" with a link to the original
// file. Converting each file's actual content to readable HTML/Markdown is a
// separate, manual Phase 6 task (see dev_spec.md).
//
// Usage: node scripts/import-legacy-resources.mjs

import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG_PATH = join(ROOT, 'migration', 'download_log.csv');
const DOWNLOADS_SRC = join(ROOT, 'migration', 'downloads');
const DOWNLOADS_DEST = join(ROOT, 'public', 'downloads');
const RESOURCES_DEST = join(ROOT, 'src', 'content', 'resources');
const UNPARSED_LOG = join(ROOT, 'migration', 'unparsed.csv');

// slug (site folder) -> [canonical book name, testament, display note]
const BOOK_MAP = {
  genesis: ['Genesis', 'old'],
  exodus: ['Exodus', 'old'],
  leviticus: ['Leviticus', 'old'],
  numbers: ['Numbers', 'old'],
  deuteronomy: ['Deuteronomy', 'old'],
  joshua: ['Joshua', 'old'],
  judges: ['Judges', 'old'],
  ruth: ['Ruth', 'old'],
  samuel1: ['1 Samuel', 'old'],
  samuel2: ['2 Samuel', 'old'],
  ecclesiastes: ['Ecclesiastes', 'old'],
  daniel: ['Daniel', 'old'],
  hosea: ['Hosea', 'old'],
  jonah: ['Jonah', 'old'],
  micah: ['Micah', 'old'],
  matthew: ['Matthew', 'new'],
  mark: ['Mark', 'new'],
  luke: ['Luke', 'new'],
  john: ['John', 'new'],
  acts: ['Acts', 'new'],
  romans: ['Romans', 'new'],
  corinthians1: ['1 Corinthians', 'new'],
  corinthians2: ['2 Corinthians', 'new'],
  galatians: ['Galatians', 'new'],
  ephesians: ['Ephesians', 'new'],
  philippians: ['Philippians', 'new'],
  timothy1: ['1 Timothy', 'new'],
  timothy2: ['2 Timothy', 'new'],
  titus: ['Titus', 'new'],
  philemon: ['Philemon', 'new'],
  hebrews: ['Hebrews', 'new'],
  james: ['James', 'new'],
  peter12: ['1 Peter', 'new'], // combined 1 & 2 Peter on the legacy site; noted in title
  john123: ['1 John', 'new'], // combined 1, 2 & 3 John on the legacy site; noted in title
  revelation: ['Revelation', 'new'],
};

const COMBINED_NOTE = {
  peter12: '(1 & 2 Peter)',
  john123: '(1, 2 & 3 John)',
};

// filename pattern: optional leading digit + letters (book code) + chapter digits
// + type code (QQ/AQ.../FM etc, or a bare Q/M) + optional trailing digit (further
// split part) + optional "_Name" suffix (used by some Revelation files) + extension
const FILENAME_RE = /^\d?[a-z]+(\d{1,3})(qq|aq|bq|cq|dq|eq|fq|mm|am|bm|cm|dm|em|fm|q|m)(\d?)(?:_([a-z]+))?\.(doc|pdf)$/i;

const PART_LABELS = { a: 'Part A', b: 'Part B', c: 'Part C', d: 'Part D', e: 'Part E', f: 'Part F' };

function typeInfoFor(code) {
  const lower = code.toLowerCase();
  const isMessage = lower.endsWith('m');
  const partLetter = lower.length === 2 ? lower[0] : null;
  const partLabel = partLetter ? PART_LABELS[partLetter] : null;
  return {
    resourceType: isMessage ? 'message' : 'study-questions',
    label: [isMessage ? 'Message' : 'Study Questions', partLabel].filter(Boolean).join(' '),
  };
}

function parseCsv(text) {
  const [header, ...lines] = text.trim().split('\n');
  const cols = header.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, values[i]]));
  });
}

function slugifyBook(book) {
  return book.toLowerCase();
}

function main() {
  if (!existsSync(LOG_PATH)) {
    console.error(`Missing ${LOG_PATH}. Run the crawl/download step first.`);
    process.exit(1);
  }

  mkdirSync(RESOURCES_DEST, { recursive: true });
  mkdirSync(DOWNLOADS_DEST, { recursive: true });

  const rows = parseCsv(readFileSync(LOG_PATH, 'utf-8')).filter((r) => r.http_status === '200');

  const seenSlugs = new Set();
  const unparsed = [];
  let created = 0;
  const typeCounts = {};
  const bookCounts = {};

  for (const row of rows) {
    const { book, filename } = row;
    const bookEntry = BOOK_MAP[book];
    if (!bookEntry) {
      unparsed.push({ ...row, reason: 'unknown book slug' });
      continue;
    }

    const [bookName, testament] = bookEntry;
    const note = COMBINED_NOTE[book] ?? '';

    const srcFile = join(DOWNLOADS_SRC, book, filename);
    if (!existsSync(srcFile)) {
      unparsed.push({ ...row, reason: 'source file missing on disk' });
      continue;
    }

    const match = filename.match(FILENAME_RE);

    let title;
    let resourceType;
    let lessonNumber;
    let passageStart;
    let baseSlugParts;

    if (match) {
      const [, chapterRaw, typeCodeRaw, part, namedSuffix] = match;
      const chapter = parseInt(chapterRaw, 10);
      const typeInfo = typeInfoFor(typeCodeRaw);
      const place = namedSuffix ? ` — ${namedSuffix[0].toUpperCase()}${namedSuffix.slice(1).toLowerCase()}` : '';
      title = `${bookName} ${chapter} ${typeInfo.label}${note ? ` ${note}` : ''}${place}`;
      resourceType = typeInfo.resourceType;
      lessonNumber = chapter;
      passageStart = `${bookName} ${chapter}`;
      baseSlugParts = [book, `ch${chapter}`, `${typeCodeRaw.toLowerCase()}${part || ''}`];
    } else {
      // Fallback for introductions and thematic files that don't follow the
      // chapter+type naming convention (e.g. "Intro_Deuteronomy.pdf", "paulsmission.pdf").
      const cleaned = filename
        .replace(/\.(doc|pdf)$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      title = `${bookName} — ${cleaned}`;
      resourceType = 'article';
      lessonNumber = undefined;
      passageStart = bookName;
      baseSlugParts = [book, cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-')];
    }

    const destDir = join(DOWNLOADS_DEST, book);
    mkdirSync(destDir, { recursive: true });
    copyFileSync(srcFile, join(destDir, filename));

    let baseSlug = baseSlugParts.filter(Boolean).join('-');
    let slug = baseSlug;
    let suffix = 2;
    while (seenSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    seenSlugs.add(slug);

    const legacyUrl = `/biblestudy/books/${book}/${filename}`;
    const downloadUrl = `/downloads/${book}/${filename}`;

    const frontmatter = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `book: ${JSON.stringify(bookName)}`,
      `testament: ${JSON.stringify(testament)}`,
      'passage:',
      `  start: ${JSON.stringify(passageStart)}`,
      `resourceType: ${JSON.stringify(resourceType)}`,
      ...(lessonNumber ? [`lessonNumber: ${lessonNumber}`] : []),
      `source: "ship-ubf.org (legacy site)"`,
      `pdf: ${JSON.stringify(downloadUrl)}`,
      'legacyUrls:',
      `  - ${JSON.stringify(legacyUrl)}`,
      'status: "draft"',
      '---',
      '',
      `_Imported from the legacy site. Passage range and readable content still need manual review —`,
      `this entry currently only links to the original downloaded file._`,
      '',
      `[Download original file](${downloadUrl})`,
      '',
    ].join('\n');

    writeFileSync(join(RESOURCES_DEST, `${slug}.md`), frontmatter);
    created += 1;
    typeCounts[resourceType] = (typeCounts[resourceType] ?? 0) + 1;
    bookCounts[bookName] = (bookCounts[bookName] ?? 0) + 1;
  }

  if (unparsed.length > 0) {
    const csv = [
      'book,filename,url,http_status,bytes,reason',
      ...unparsed.map((r) => `${r.book},${r.filename},${r.url},${r.http_status},${r.bytes},${r.reason}`),
    ].join('\n');
    writeFileSync(UNPARSED_LOG, csv);
  }

  console.log(`Created ${created} draft resource entries.`);
  console.log(`Books covered: ${Object.keys(bookCounts).length}`);
  console.log('By type:', typeCounts);
  if (unparsed.length > 0) {
    console.log(`${unparsed.length} files could not be parsed — see migration/unparsed.csv`);
  }
}

main();
