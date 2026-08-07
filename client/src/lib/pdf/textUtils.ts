import type { JsPdfInstance } from './jspdf'

// FontAwesome (and most icon fonts) live in the Unicode Private Use Area.
// jsPDF's built-in fonts have no glyphs there, so any such character
// silently renders as a fallback box/circle instead of being visible text —
// stripping it is strictly a rendering safeguard for this export, not a fix
// for however the character got into the source string to begin with.
const ICON_FONT_CHAR_PATTERN = /[-]/g

export function sanitizeText(text: string): string {
  return text.replace(ICON_FONT_CHAR_PATTERN, '')
}

/** Wraps plain (unannotated) text to `maxWidth`, at whatever font is currently set on `doc`. */
export function wrapPlainText(doc: JsPdfInstance, text: string, maxWidth: number): string[] {
  const words = sanitizeText(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (doc.getTextWidth(candidate) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

const EXCERPT_MAX_LENGTH = 90
export function excerpt(text: string): string {
  const trimmed = text.trim()
  return trimmed.length > EXCERPT_MAX_LENGTH ? `${trimmed.slice(0, EXCERPT_MAX_LENGTH).trimEnd()}…` : trimmed
}
