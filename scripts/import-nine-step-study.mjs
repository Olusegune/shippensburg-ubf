// Imports the 9-step introductory study series from migration/downloads/9steps/.
// Study-questions PDFs are text-extracted and published directly (short, factual
// worksheet content). Message PDFs are imported as drafts linking to the original
// file only — longer sermon-style prose gets human review before publishing.
//
// Usage: node scripts/import-nine-step-study.mjs

import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'migration', 'downloads', '9steps');
const DEST_DOWNLOADS = join(ROOT, 'public', 'downloads', '9steps');
const RESOURCES_DEST = join(ROOT, 'src', 'content', 'resources');

const LESSONS = [
  { n: 1, book: 'John', chapter: 2, testament: 'new', q: 'jn02qq.pdf', m: ['9JN02AM.pdf'] },
  { n: 2, book: 'John', chapter: 3, testament: 'new', q: 'jn03qq.pdf', m: ['9JN03AM1.pdf', '9JN03AM2.pdf'] },
  { n: 3, book: 'John', chapter: 4, testament: 'new', q: 'jn04qq.pdf', m: ['9JN04AM.pdf'] },
  { n: 4, book: 'John', chapter: 8, testament: 'new', q: 'jn08qq.pdf', m: ['9JN08MM.pdf'] },
  { n: 5, book: 'Mark', chapter: 2, testament: 'new', q: 'mk02qq.pdf', m: ['9MK02MM.pdf'] },
  { n: 6, book: 'Genesis', chapter: 1, testament: 'old', q: 'ge01aq.pdf', m: ['9GEN01AM.pdf'], part: 'A' },
  { n: 7, book: 'Genesis', chapter: 1, testament: 'old', q: 'ge01bq.pdf', m: ['9GEN01BM.pdf'], part: 'B' },
  { n: 8, book: 'Genesis', chapter: 2, testament: 'old', q: 'ge02qq.pdf', m: ['9GEN02MM.pdf'] },
  { n: 9, book: 'Genesis', chapter: 3, testament: 'old', q: 'ge03qq.pdf', m: ['9GEN03MM.pdf'] },
];

function cleanText(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

async function extractPdfText(path) {
  const buffer = readFileSync(path);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return cleanText(result.text);
}

async function main() {
  mkdirSync(RESOURCES_DEST, { recursive: true });
  mkdirSync(DEST_DOWNLOADS, { recursive: true });

  let published = 0;
  let draftMessages = 0;

  for (const lesson of LESSONS) {
    const partLabel = lesson.part ? ` (Part ${lesson.part})` : '';
    const qSrc = join(SRC, lesson.q);
    if (!existsSync(qSrc)) {
      console.warn(`Missing ${lesson.q}, skipping lesson ${lesson.n}`);
      continue;
    }
    copyFileSync(qSrc, join(DEST_DOWNLOADS, lesson.q));
    const qText = await extractPdfText(qSrc);

    const qSlug = `nine-step-lesson-${lesson.n}-questions`;
    const qTitle = `${lesson.book} ${lesson.chapter}${partLabel} — Study Questions`;
    const qFrontmatter = [
      '---',
      `title: ${JSON.stringify(qTitle)}`,
      `book: ${JSON.stringify(lesson.book)}`,
      `testament: ${JSON.stringify(lesson.testament)}`,
      'passage:',
      `  start: ${JSON.stringify(`${lesson.book} ${lesson.chapter}`)}`,
      'resourceType: "study-questions"',
      'series: "nine-step-study"',
      `lessonNumber: ${lesson.n}`,
      'audience:',
      '  - beginner',
      'source: "ship-ubf.org (legacy site)"',
      `pdf: ${JSON.stringify(`/downloads/9steps/${lesson.q}`)}`,
      'legacyUrls:',
      `  - ${JSON.stringify(`/biblestudy/9steps/${lesson.q}`)}`,
      'status: "published"',
      '---',
      '',
      qText,
      '',
    ].join('\n');
    writeFileSync(join(RESOURCES_DEST, `${qSlug}.md`), qFrontmatter);
    published += 1;

    for (const [i, mFile] of lesson.m.entries()) {
      const mSrc = join(SRC, mFile);
      if (!existsSync(mSrc)) continue;
      copyFileSync(mSrc, join(DEST_DOWNLOADS, mFile));
      const mSuffix = lesson.m.length > 1 ? ` (Part ${i + 1})` : '';
      const mSlug = `nine-step-lesson-${lesson.n}-message${lesson.m.length > 1 ? `-${i + 1}` : ''}`;
      const mTitle = `${lesson.book} ${lesson.chapter}${partLabel} — Message${mSuffix}`;
      const mFrontmatter = [
        '---',
        `title: ${JSON.stringify(mTitle)}`,
        `book: ${JSON.stringify(lesson.book)}`,
        `testament: ${JSON.stringify(lesson.testament)}`,
        'passage:',
        `  start: ${JSON.stringify(`${lesson.book} ${lesson.chapter}`)}`,
        'resourceType: "message"',
        'series: "nine-step-study"',
        `lessonNumber: ${lesson.n}`,
        'audience:',
        '  - beginner',
        `pairedResource: ${JSON.stringify(qSlug)}`,
        'source: "ship-ubf.org (legacy site)"',
        `pdf: ${JSON.stringify(`/downloads/9steps/${mFile}`)}`,
        'legacyUrls:',
        `  - ${JSON.stringify(`/biblestudy/9steps/${mFile}`)}`,
        'status: "draft"',
        '---',
        '',
        '_Message content pending manual review before publishing — download the original PDF above._',
        '',
      ].join('\n');
      writeFileSync(join(RESOURCES_DEST, `${mSlug}.md`), mFrontmatter);
      draftMessages += 1;
    }
  }

  console.log(`Published ${published} study-questions lessons.`);
  console.log(`Imported ${draftMessages} message files as drafts (pending review).`);
}

main();
