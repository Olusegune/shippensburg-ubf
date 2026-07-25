# UBF Shippensburg Website — Development Specification

Scaffolded per the approved brief (Steps 1–7). This file tracks what's implemented vs. still pending.

## Implemented
- Astro + TypeScript + Tailwind 4 foundation
- Content collections: `pages`, `resources`, `series`, `events`, `testimonies`, `people`, `settings`
- `resources` schema with the full brief metadata set (book, testament, passage, resourceType, series,
  lessonNumber, audience, topics, author, source, date, keyVerse, pdf, pairedResource, externalUrl, legacyUrls)
- Global layout: header w/ mobile nav, footer w/ ministry/study/UBF/policy link groups, skip-to-content link
- Homepage sections per the brief (hero, gospel intro, featured pathways, this-week schedule, closing CTA)
- Resource library index, books index (all 66 books, disabled state for books without resources), per-book page
- Resource detail page (passage, key verse, PDF download, print, paired resource, source attribution)
- Bible study Start Here + nine-step series listing
- Events index with upcoming/past separation (past events never render as upcoming)
- Bible-study-request form (Netlify Forms attributes, honeypot field, consent checkbox)
- Visit/Contact pages reading from the single `settings` canonical source
- Privacy/Accessibility placeholder pages
- `trailingSlash: 'always'` to match the brief's URL strategy

## Not yet implemented (see brief Step 7 for phase ordering)
- Pagefind search integration
- Decap CMS admin
- Redirect map for legacy URLs (needs Phase 1 crawl output first)
- Sitemap/robots.txt generation, structured data (Organization/Event/Article/Breadcrumb schema)
- Real content migration (all current content is placeholder/sample)
- Testimonies, People (leadership) collection entries
- Axe/Playwright/Lighthouse CI wiring
- Real ministry assets (logo, photography, confirmed schedule) — blocked on ministry providing these

## Next step
Phase 1 content inventory: crawl the live site, build the migration manifest, and replace the placeholder
`settings/site.md` values with confirmed ministry information before any further design work.
