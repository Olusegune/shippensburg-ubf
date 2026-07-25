# UBF Shippensburg Website — Development Specification

Scaffolded per the approved brief (Steps 1–7). This file tracks what's implemented vs. still pending.

## Implemented
- Astro + TypeScript + Tailwind 4 foundation, deployed via Cloudflare Pages from
  [github.com/Olusegune/shippensburg-ubf](https://github.com/Olusegune/shippensburg-ubf)
- Content collections: `pages`, `resources`, `series`, `events`, `testimonies`, `people`, `settings`
- `resources` schema with the full brief metadata set (book, testament, passage, resourceType, series,
  lessonNumber, audience, topics, author, source, date, keyVerse, pdf, pairedResource, externalUrl, legacyUrls)
- Global layout: header w/ mobile nav, footer w/ ministry/study/UBF/policy link groups, skip-to-content link
- Homepage sections per the brief (hero, gospel intro, featured pathways, this-week schedule, closing CTA)
- Resource library index, books index (all 66 books, disabled state for books without resources), per-book page
- Resource detail page (passage, key verse, PDF download, print, paired resource, source attribution)
- Bible study Start Here + nine-step series listing (9 lessons **published** with real extracted content)
- Events index with upcoming/past separation (past events never render as upcoming)
- Bible-study-request form (Netlify Forms attributes, honeypot field, consent checkbox)
- Visit/Contact pages reading from the single `settings` canonical source
- Privacy/Accessibility placeholder pages, `/resources/people/` (leaders & character studies), `/music/`
- `trailingSlash: 'always'` to match the brief's URL strategy

## Content migration status (from ship-ubf.org)
Scripts live in `scripts/`, re-runnable against `migration/download_log.csv` and friends.

| Section | Crawled | Downloaded | Imported | Published |
|---|---|---|---|---|
| Book study library (34 books) | Yes | 772/879 files (107 dead links on live site) | Yes, as `resources` | No — all `status: draft`, body is a download link only |
| 9-step study series | Yes | 19/19 files | Yes | Questions (9): **published** with extracted text. Messages (10): draft, download-link only |
| Spiritual leaders (8 bios) + biblical character studies (7) | Yes | Yes (HTML/PDF archived) | Yes, as `people` | No — author/licensing not confirmed, metadata only, no body text extracted |
| Testimonies (2010 Genesis Bible Cafe) | Yes | Page archived | 1 placeholder entry | **Never publish without written per-person consent** — `consentGiven: false` |
| Praise music (~70 hymns/gospel MP3s) | Yes (inventory only) | **Not downloaded** | Sample linked externally on `/music/` | Recording rights unconfirmed — do not rehost audio until licensing is confirmed with the ministry |
| Photo album | Not yet crawled | — | — | Brief already recommends replacing/removing this section rather than migrating |

## Not yet implemented (see brief Step 7 for phase ordering)
- Pagefind search integration
- Decap CMS admin
- Redirect map for legacy URLs (raw link inventory exists in `migration/`, redirect rules not yet generated)
- Sitemap/robots.txt generation, structured data (Organization/Event/Article/Breadcrumb schema)
- Axe/Playwright/Lighthouse CI wiring
- Real ministry assets (logo, photography, confirmed schedule, leadership names) — blocked on ministry providing these
- Manual review + publishing pass over the 724 draft book resources and 10 draft nine-step messages
- Licensing confirmation for leader/character studies and hymn recordings
- Written consent collection for testimonies before any publishing

## Next step
Confirm real ministry settings (`src/content/settings/site.md` is still placeholder data) and begin the
manual review/publish pass on draft resources, starting with the highest-traffic books (John, Luke, Mark,
Acts, per download volume).
