export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function articleWordCount(contentText: string, summary: string): number {
  return countWords(contentText) + countWords(summary);
}
