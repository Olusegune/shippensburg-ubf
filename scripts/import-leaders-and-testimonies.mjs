// Imports spiritual-leader bios, biblical-character studies, and a testimony
// placeholder from the legacy site. These are metadata-only imports: original
// files are archived under public/downloads/ but body text is NOT extracted,
// since authorship/licensing for these third-party essays hasn't been confirmed
// (see dev_spec.md "Required for resource migration" — licensing info still needed
// from the ministry) and testimonies additionally require written consent per
// named individual before anything can be published.
//
// Usage: node scripts/import-leaders-and-testimonies.mjs

import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PEOPLE_DEST = join(ROOT, 'src', 'content', 'people');
const TESTIMONIES_DEST = join(ROOT, 'src', 'content', 'testimonies');
const DOWNLOADS_DEST = join(ROOT, 'public', 'downloads', 'leaders');

const LEADERS = [
  { file: 'carey.html', name: 'William Carey' },
  { file: 'dwight.html', name: 'Timothy Dwight' },
  { file: 'edwards.html', name: 'Jonathan Edwards' },
  { file: 'luther.html', name: 'Martin Luther' },
  { file: 'nightingale.html', name: 'Florence Nightingale' },
  { file: 'whitefield.html', name: 'George Whitefield' },
  { file: 'wilder.html', name: 'Robert Wilder and the Student Volunteer Movement' },
  { file: 'winthrop.html', name: 'John Winthrop' },
];

const CHARACTERS = [
  { file: 'characters/Joseph.pdf', name: 'Joseph' },
  { file: 'characters/Shriveled_Hand.pdf', name: 'The Man with a Shriveled Hand' },
  { file: 'characters/Mark.pdf', name: 'Mark' },
  { file: 'characters/Mary.pdf', name: 'Mary, the Mother of Jesus' },
  { file: 'characters/Rahab.pdf', name: 'Rahab' },
  { file: 'characters/Timothy.pdf', name: 'Timothy' },
  { file: 'characters/Zechariah.pdf', name: 'Zechariah and Elizabeth' },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function main() {
  mkdirSync(PEOPLE_DEST, { recursive: true });
  mkdirSync(TESTIMONIES_DEST, { recursive: true });
  mkdirSync(join(DOWNLOADS_DEST, 'characters'), { recursive: true });

  let peopleCreated = 0;

  for (const leader of [...LEADERS, ...CHARACTERS]) {
    const src = join(ROOT, 'migration', 'downloads', 'leaders', leader.file);
    if (!existsSync(src)) {
      console.warn(`Missing ${leader.file}, skipping`);
      continue;
    }
    const destPath = join(DOWNLOADS_DEST, leader.file);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(src, destPath);

    const slug = slugify(leader.name);
    const role = leader.file.startsWith('characters/')
      ? 'Biblical character study'
      : 'Spiritual leader study (historical figure)';

    const frontmatter = [
      '---',
      `name: ${JSON.stringify(leader.name)}`,
      `role: ${JSON.stringify(role)}`,
      '---',
      '',
      `_Original study archived from the legacy site. Author and licensing not yet`,
      `confirmed with the ministry — see dev_spec.md. Full write-up pending manual`,
      `review before publishing._`,
      '',
      `[Original file](/downloads/leaders/${leader.file})`,
      '',
    ].join('\n');

    writeFileSync(join(PEOPLE_DEST, `${slug}.md`), frontmatter);
    peopleCreated += 1;
  }

  // Testimony page: personal narratives from named individuals. Do not extract
  // or publish content without per-person written consent (brief requirement).
  const testimonyFrontmatter = [
    '---',
    'title: "2010 Fall Genesis Bible Cafe Testimonies"',
    'name: "Multiple contributors (names not yet confirmed for publication)"',
    'consentGiven: false',
    'status: "draft"',
    '---',
    '',
    '_Archived from the legacy testimony page. Contains personal testimonies from',
    'named individuals — DO NOT PUBLISH any of this content until written consent',
    'has been obtained from each contributor, per the ministry brief\'s privacy',
    'requirements. The original page is preserved at migration/raw_pages/testimony_index.html',
    'for reference during that review._',
    '',
  ].join('\n');
  writeFileSync(join(TESTIMONIES_DEST, 'genesis-bible-cafe-2010.md'), testimonyFrontmatter);

  console.log(`Created ${peopleCreated} people entries (${LEADERS.length} leaders + ${CHARACTERS.length} characters).`);
  console.log('Created 1 testimony placeholder — flagged consentGiven: false, status: draft.');
}

main();
