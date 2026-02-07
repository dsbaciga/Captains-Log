/**
 * Strips markdown formatting from text for use in plain-text preview contexts
 * (e.g., truncated cards with line-clamp where block elements break layout).
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  let result = text;

  // Remove headings (# Heading)
  result = result.replace(/^#{1,6}\s+/gm, '');

  // Remove images ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Replace links [text](url) with just the text
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Remove bold/italic (handle bold-italic first)
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  result = result.replace(/___(.+?)___/g, '$1');
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/_(.+?)_/g, '$1');

  // Remove strikethrough ~~text~~
  result = result.replace(/~~(.+?)~~/g, '$1');

  // Remove inline code `code`
  result = result.replace(/`([^`]+)`/g, '$1');

  // Remove code blocks ```code```
  result = result.replace(/```[\s\S]*?```/g, '');

  // Remove blockquotes > text
  result = result.replace(/^>\s+/gm, '');

  // Remove unordered list markers (-, *, +)
  result = result.replace(/^[\s]*[-*+]\s+/gm, '');

  // Remove ordered list markers (1. 2. etc.)
  result = result.replace(/^[\s]*\d+\.\s+/gm, '');

  // Remove horizontal rules
  result = result.replace(/^[-*_]{3,}\s*$/gm, '');

  // Collapse multiple newlines into a single space
  result = result.replace(/\n{2,}/g, ' ');

  // Replace remaining newlines with spaces
  result = result.replace(/\n/g, ' ');

  // Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ');

  return result.trim();
}
