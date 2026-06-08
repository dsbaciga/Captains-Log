/**
 * Helpers for sanitizing untrusted text before it is passed to an LLM.
 *
 * Control bytes (NUL, escape, DEL, etc.) are routinely used to smuggle
 * prompt-injection payloads or terminator codes. We strip them while
 * preserving common whitespace (\t \n \r). The implementation iterates
 * char codes rather than using a regex literal so the linter doesn't have
 * to be silenced for legitimate control-character handling.
 */

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const DEL = 0x7f;

function isPrintableOrAllowedWhitespace(charCode: number): boolean {
  if (charCode === TAB || charCode === LF || charCode === CR) return true;
  return charCode >= SPACE && charCode !== DEL;
}

export function sanitizeForPrompt(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (isPrintableOrAllowedWhitespace(text.charCodeAt(i))) {
      out += text[i];
    }
  }
  return out;
}

/**
 * Strip HTML tags from a string. Suitable for journal entry content that may
 * contain rich-text markup before being handed to an LLM. Not a security-grade
 * HTML sanitizer — do not use on output that will be rendered as HTML.
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}
