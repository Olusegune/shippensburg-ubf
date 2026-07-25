import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const BIBLE_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians',
  '2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James',
  '1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
] as const;

const RESOURCE_TYPES = [
  'study-questions',
  'message',
  'testimony',
  'article',
  'devotional',
] as const;

const AUDIENCES = ['beginner', 'student', 'general'] as const;

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    book: z.enum(BIBLE_BOOKS),
    testament: z.enum(['old', 'new']),
    passage: z.object({
      start: z.string(),
      end: z.string().optional(),
    }),
    resourceType: z.enum(RESOURCE_TYPES),
    status: z.enum(['draft', 'published']).default('published'),
    series: z.string().optional(),
    lessonNumber: z.number().optional(),
    audience: z.array(z.enum(AUDIENCES)).optional(),
    topics: z.array(z.string()).optional(),
    author: z.string().optional(),
    source: z.string().optional(),
    date: z.coerce.date().optional(),
    keyVerse: z.string().optional(),
    summary: z.string().optional(),
    pdf: z.string().optional(),
    pairedResource: z.string().optional(),
    externalUrl: z.string().url().optional(),
    legacyUrls: z.array(z.string()).optional(),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/series' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    audience: z.array(z.enum(AUDIENCES)).optional(),
    order: z.number().optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['draft', 'published']).default('published'),
    location: z.string().optional(),
    onlineUrl: z.string().url().optional(),
    summary: z.string().optional(),
    image: z.string().optional(),
    registrationUrl: z.string().url().optional(),
    contact: z.string().optional(),
  }).refine((data) => data.location || data.onlineUrl, {
    message: 'An event requires either a location or an onlineUrl',
  }),
});

const testimonies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/testimonies' }),
  schema: z.object({
    title: z.string(),
    name: z.string(),
    consentGiven: z.boolean(),
    status: z.enum(['draft', 'published']).default('draft'),
    photo: z.string().optional(),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string().optional(),
    bio: z.string().optional(),
  }),
});

const settings = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/settings' }),
  schema: z.object({
    ministryEmail: z.string().email(),
    phone: z.string().optional(),
    worshipTime: z.string(),
    worshipLocation: z.string(),
    fellowshipTime: z.string(),
    fellowshipLocation: z.string(),
    address: z.string(),
    mapUrl: z.string().url(),
    socialUrls: z.array(z.string().url()).optional(),
  }),
});

export const collections = { pages, resources, series, events, testimonies, people, settings };
export { BIBLE_BOOKS, RESOURCE_TYPES, AUDIENCES };
