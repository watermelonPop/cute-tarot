import { remToMm, pxToMm } from './units'

// --- Tunables --------------------------------------------------------------
export const MARGIN = 18 // mm, all sides
export const FONT_BODY_PT = 12
// Mirrors the live app's `.readingParagraph { line-height: 2; }` — a
// "double spaced" line box is twice the font's own natural single-line
// height, so this is derived from FONT_BODY_PT rather than a flat
// constant, and will auto-scale correctly if FONT_BODY_PT ever changes.
export const LINE_HEIGHT_MM = FONT_BODY_PT * 0.3528 * 2
export const TOC_LINE_HEIGHT_MM = FONT_BODY_PT * 0.3528 * 1.4 * 1.5 // 1.5-spaced
export const FONT_HEADING_PT: Record<number, number> = { 1: 18, 2: 14, 3: 12 }
export const PARAGRAPH_GAP_MM = 4
export const SECTION_GAP_MM = 7
// Highlight rects track the text's own cap-height, not the surrounding
// double-spaced line gutter — both derived from FONT_BODY_PT so they
// scale with it. Tune the multipliers if the highlight looks vertically
// off once you embed a real font.
export const HIGHLIGHT_RECT_TOP_OFFSET_MM = FONT_BODY_PT * 0.3528 * 0.82
export const HIGHLIGHT_RECT_HEIGHT_MM = FONT_BODY_PT * 0.3528 * 1.15
export const NOTE_BOX_PADDING_MM = 3
export const NOTES_COLUMN_WIDTH_MM = 55 // approximates the live app's 280px NotesPanel width
export const NOTES_COLUMN_GAP_MM = 8    // approximates the live app's 20px gap
export const NOTE_CARD_GAP_MM = 4       // mirrors NotesPanel.tsx's CARD_GAP_PX
export const REVEAL_HIDDEN_IN_EXPORT = false // see note in the chat response above
export const COLOR_BLACK: [number, number, number] = [0, 0, 0]
export const COLOR_GRAY: [number, number, number] = [90, 90, 90]
export const COLOR_NOTE_BORDER: [number, number, number] = [180, 180, 180]
export const CARD_SECTION_HEADING_ID = 'cardImagesSection'
export const CARD_BOX_PADDING_MM = 3
export const CARD_COLUMN_GAP_MM = 4
export const CARD_LABEL_FONT_PT = 12
export const CARD_LABEL_PADDING_MM = 2 // vertical padding above/below the label text within its band
export const DESC_IMAGE_WIDTH_MM = 40
export const DESC_IMAGE_TEXT_GAP_MM = 4
export const CARD_SECTION_TOP_GAP_MM = remToMm(1) // matches the gap other headings get before their content
export const NOTE_CARD_BORDER_RADIUS_MM = pxToMm(8)          // matches .noteCard's border-radius: 8px
export const NOTE_QUOTE_BAR_WIDTH_MM = pxToMm(3)             // matches .noteCardQuote's border-left: 3px
export const NOTE_QUOTE_BAR_GAP_MM = remToMm(0.5)            // matches .noteCardQuote's padding-left: 0.5rem
export const NOTE_QUOTE_GAP_MM = remToMm(0.5)                // matches .noteCardQuote's margin-bottom: 0.5rem
export const NOTE_QUOTE_COLOR: [number, number, number] = [102, 102, 102]  // #666
export const NOTE_DEFAULT_BAR_COLOR: [number, number, number] = [204, 204, 204] // #ccc, the unhighlighted default

// reading.name is optional on the type (an anonymous or not-yet-named
// reading has none) — this is the shared fallback everywhere the reading's
// title gets rendered, so the PDF heading/table-of-contents never crash
// trying to sanitize/measure `undefined` text.
export const DEFAULT_READING_TITLE = 'Untitled Reading'
