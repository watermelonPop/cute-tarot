import type { JsPdfInstance } from './jspdf'
import type { Ctx } from './context'
import { ensureSpace } from './context'
import { sanitizeText } from './textUtils'
import { writeSubHeadingPill } from './headings'
import type { TocItem } from '../../components/TableOfContents'
import { FONT_BODY_PT, TOC_LINE_HEIGHT_MM } from './constants'

// --- Table of contents --------------------------------------------------------

export interface FlatTocEntry {
  id: string
  label: string
  depth: number
}

export function flattenToc(items: TocItem[], depth = 0): FlatTocEntry[] {
  const out: FlatTocEntry[] = []
  for (const item of items) {
    out.push({ id: item.targetId, label: item.label, depth })
    if (item.children?.length) out.push(...flattenToc(item.children, depth + 1))
  }
  return out
}

/** Draws the TOC entries (label + page number, each row a clickable link) across as many pages as needed. */
export function writeToc(doc: JsPdfInstance, ctx: Ctx, entries: FlatTocEntry[], pageNumberForId: (id: string) => number | undefined): void {
  writeSubHeadingPill(doc, ctx, 'Table of Contents')

  for (const entry of entries) {
    ensureSpace(doc, ctx, TOC_LINE_HEIGHT_MM)
    ctx.y += TOC_LINE_HEIGHT_MM

    const indent = entry.depth * 6
    const targetPage = pageNumberForId(entry.id)
    const pageLabel = String(targetPage ?? '')

    doc.setFont('times', entry.depth === 0 ? 'bold' : 'normal')
    doc.setFontSize(FONT_BODY_PT)
    const safeEntryLabelText = sanitizeText(entry.label)
    doc.text(safeEntryLabelText, ctx.x + indent, ctx.y)

    const safePageLabelText = sanitizeText(pageLabel)
    const pageLabelWidth = doc.getTextWidth(safePageLabelText)
    doc.text(safePageLabelText, ctx.x + ctx.contentWidth - pageLabelWidth, ctx.y)

    if (targetPage !== undefined) {
      // Clickable area covers the full row, not just the page-number text —
      // clicking anywhere on the entry's line jumps to that page.
      doc.link(ctx.x, ctx.y - TOC_LINE_HEIGHT_MM + 1.5, ctx.contentWidth, TOC_LINE_HEIGHT_MM, { pageNumber: targetPage })
    }
  }
}
