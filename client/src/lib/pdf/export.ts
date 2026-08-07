import type { JsPdfInstance } from './jspdf'
import { loadPdfLibraries } from './jspdf'
import { buildTheme } from './theme'
import { makeCtx } from './context'
import { loadCardImages, getReadingCardCount } from './images'
import type { PdfExportData } from './data'
import { writeHeading } from './headings'
import { renderContent } from './render'
import type { FlatTocEntry } from './toc'
import { flattenToc, writeToc } from './toc'
import { buildReadingToc } from '../readingHelpers'
import { CARD_SECTION_HEADING_ID, DEFAULT_READING_TITLE } from './constants'

export type { PdfExportData } from './data'

// --- Entry point ---------------------------------------------------------------

/**
 * Renders `data` to a paginated A4 PDF with real, selectable text and
 * triggers a download as `filename`. Two-pass: the first pass lays out the
 * actual content silently to learn which page each heading lands on, then
 * a second pass draws a real TOC using those page numbers followed by the
 * real content — since page numbers can only be known once layout has
 * already happened once.
 */
export async function exportReadingToPdfNative(data: PdfExportData, filename: string): Promise<void> {
  await loadPdfLibraries()
  const { jsPDF } = window.jspdf!
  const theme = buildTheme(data.selectedDeck)

  // Images must be loaded before the dry pass, not just the final one — the
  // dry pass's recorded page numbers are only accurate if it lays out
  // exactly the content the final pass will. A Description section's
  // side-image indent changes how its paragraph wraps (and so how tall it
  // is), which shifts every page number that comes after it.
  const images = await loadCardImages(data)

  const dryDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as JsPdfInstance
  const pageMap = new Map<string, number>()
  const dryCtx = makeCtx(dryDoc, theme, id => pageMap.set(id, dryDoc.internal.getNumberOfPages()))
  renderContent(dryDoc, dryCtx, data, images)

  const cardCount = getReadingCardCount(data)
  const cardEntry: FlatTocEntry = {
    id: CARD_SECTION_HEADING_ID,
    label: `${cardCount} Card${cardCount === 1 ? '' : 's'}`,
    depth: 0,
  }
  const tocItems = buildReadingToc(data.reading, data.cards, data.spreads, data.relations)
  const entries = [cardEntry, ...flattenToc(tocItems)]

  const tocSizingDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as JsPdfInstance
  const tocSizingCtx = makeCtx(tocSizingDoc, theme)
  writeHeading(tocSizingDoc, tocSizingCtx, data.reading.name || DEFAULT_READING_TITLE, 1, undefined, true)
  writeToc(tocSizingDoc, tocSizingCtx, entries, id => pageMap.get(id))
  const tocPageCount = tocSizingDoc.internal.getNumberOfPages()

  const finalDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as JsPdfInstance
  const finalTocCtx = makeCtx(finalDoc, theme)
  writeHeading(finalDoc, finalTocCtx, data.reading.name || DEFAULT_READING_TITLE, 1, undefined, true)
  writeToc(finalDoc, finalTocCtx, entries, id => {
    const p = pageMap.get(id)
    return p === undefined ? undefined : p + tocPageCount
  })

  finalDoc.addPage()
  const finalContentCtx = makeCtx(finalDoc, theme)
  renderContent(finalDoc, finalContentCtx, data, images)

  finalDoc.save(filename)
}
