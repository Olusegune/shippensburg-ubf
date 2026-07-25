// Small curated list of short verses in the King James Version — chosen because
// KJV text is public domain, unlike NIV/ESV/etc which have redistribution
// restrictions. The brief's "preferred Bible translation" is still an open
// question for the ministry; swap this list once that's confirmed.
const VERSES = [
  { text: 'Thy word is a lamp unto my feet, and a light unto my path.', reference: 'Psalm 119:105' },
  { text: 'I can do all things through Christ which strengtheneth me.', reference: 'Philippians 4:13' },
  { text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', reference: 'Proverbs 3:5' },
  { text: 'For God so loved the world, that he gave his only begotten Son.', reference: 'John 3:16' },
  { text: 'The LORD is my shepherd; I shall not want.', reference: 'Psalm 23:1' },
  { text: 'Be still, and know that I am God.', reference: 'Psalm 46:10' },
  { text: 'I am the vine, ye are the branches: he that abideth in me, and I in him, the same bringeth forth much fruit.', reference: 'John 15:5' },
  { text: 'And we know that all things work together for good to them that love God.', reference: 'Romans 8:28' },
  { text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', reference: 'Matthew 11:28' },
  { text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed.', reference: 'Joshua 1:9' },
  { text: 'The joy of the LORD is your strength.', reference: 'Nehemiah 8:10' },
  { text: 'But they that wait upon the LORD shall renew their strength.', reference: 'Isaiah 40:31' },
  { text: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.', reference: 'Psalm 37:4' },
  { text: 'In all thy ways acknowledge him, and he shall direct thy paths.', reference: 'Proverbs 3:6' },
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getVerseOfDay(date: Date = new Date()) {
  const index = dayOfYear(date) % VERSES.length;
  return VERSES[index];
}
