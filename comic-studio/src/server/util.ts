/**
 * Small helpers shared by route handlers.
 */

/** Extract a JSON object from agent text — handles ```json fences and a
 *  string-aware brace matcher so braces inside JSON string literals don't
 *  fool the depth counter. */
export function extractJson(text: string): string {
  // Try fenced JSON first.
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch && fenceMatch[1]) {
    const inner = fenceMatch[1].trim();
    if (inner.startsWith('{') && inner.endsWith('}')) {
      try {
        JSON.parse(inner);
        return inner;
      } catch {
        /* fall through */
      }
    }
  }

  // String-aware brace matching — skips braces inside JSON string literals.
  const start = text.indexOf('{');
  if (start === -1) return text;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** Make a string safe to use as a filename on Windows/macOS/Linux. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 120) || 'comic';
}
