export function formatPassage(start: string, end?: string): string {
  if (!end || end === start) return start;

  const startChapter = start.match(/^(.*\d+):\d+$/)?.[1];
  const endChapter = end.match(/^(.*\d+):\d+$/)?.[1];

  if (startChapter && startChapter === endChapter) {
    const endVerse = end.slice(endChapter.length + 1);
    return `${start}–${endVerse}`;
  }

  return `${start}–${end}`;
}
