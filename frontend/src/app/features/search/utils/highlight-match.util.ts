/** One piece of a highlighted string; `match` pieces are wrapped in <mark>. */
export interface HighlightPart {
  text: string;
  match: boolean;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text so it can be put into HTML as plain text. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits text into plain and matching parts, case-insensitively and literally, as the
 * server matches. Templates render the parts with interpolation, so nothing is parsed as HTML.
 */
export function highlightMatch(text: string, query: string): HighlightPart[] {
  const needle = query.trim();
  if (!text) return [];
  if (!needle) return [{ text, match: false }];

  const pattern = new RegExp(escapeRegExp(needle), 'gi');
  const parts: HighlightPart[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const start = found.index;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: found[0], match: true });
    last = start + found[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

/**
 * The same split as one HTML string, with every part escaped first. For callers that must
 * build markup; Angular templates should use highlightMatch instead.
 */
export function highlightMatchHtml(text: string, query: string): string {
  return highlightMatch(text, query)
    .map((part) => (part.match ? `<mark>${escapeHtml(part.text)}</mark>` : escapeHtml(part.text)))
    .join('');
}
