import type { JsPdfInstance } from './jspdf'
import type { PdfExportData } from './data'

// Raster resolution used when baking rounded corners into a card image (see
// drawRoundedImage below) — high enough to stay crisp on a printed page.
const ROUNDED_IMAGE_PX_PER_MM = 300 / 25.4

/**
 * Draws `imgEl` clipped to a rounded-rect region, matching the CSS
 * border-radius look used on the box these images sit inside. jsPDF's own
 * clip()/discardPath()/save-restore-GraphicsState combo can leave the clip
 * region in effect for unrelated content drawn afterward if it isn't paired
 * up exactly right across a two-pass render — instead, this bakes the round
 * corners into the image itself via a plain Canvas2D clip (synchronous,
 * since `imgEl` is already fully decoded), then hands jsPDF a flat PNG with
 * nothing left for it to clip.
 */
export function drawRoundedImage(
  doc: JsPdfInstance,
  imgEl: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const wPx = Math.max(1, Math.round(w * ROUNDED_IMAGE_PX_PER_MM))
  const hPx = Math.max(1, Math.round(h * ROUNDED_IMAGE_PX_PER_MM))
  const rPx = Math.min(radius * ROUNDED_IMAGE_PX_PER_MM, wPx / 2, hPx / 2)

  const canvas = document.createElement('canvas')
  canvas.width = wPx
  canvas.height = hPx
  const c2d = canvas.getContext('2d')

  if (!c2d) {
    // No 2D context available — fall back to a square-cornered image rather
    // than dropping it entirely.
    doc.addImage(imgEl.src, 'PNG', x, y, w, h)
    return
  }

  c2d.beginPath()
  c2d.moveTo(rPx, 0)
  c2d.arcTo(wPx, 0, wPx, hPx, rPx)
  c2d.arcTo(wPx, hPx, 0, hPx, rPx)
  c2d.arcTo(0, hPx, 0, 0, rPx)
  c2d.arcTo(0, 0, wPx, 0, rPx)
  c2d.closePath()
  c2d.clip()
  c2d.drawImage(imgEl, 0, 0, wPx, hPx)

  doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h)
}

const DESC_IMAGE_WIDTH_MM = 40

export interface SideImage {
  dataUrl: string
  widthMm: number
  heightMm: number
}

export function buildDescSideImage(image: LoadedCardImage): SideImage {
  const aspect = image.width / image.height
  const widthMm = DESC_IMAGE_WIDTH_MM
  return { dataUrl: image.dataUrl, widthMm, heightMm: widthMm / aspect }
}

export interface LoadedCardImage {
  dataUrl: string          // upright orientation — used in the Description sections
  reversedDataUrl: string  // 180deg rotated, pre-baked for the top card-images section
  element: HTMLImageElement          // upright, already decoded — for synchronous canvas redraws (e.g. rounded corners)
  reversedElement: HTMLImageElement  // 180deg rotated, already decoded
  width: number
  height: number
}

async function loadCardImage(url: string): Promise<LoadedCardImage | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read image blob'))
      reader.readAsDataURL(blob)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Failed to load image for measurement'))
      el.src = dataUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx2d = canvas.getContext('2d')

    let reversedDataUrl = dataUrl
    if (ctx2d) {
      ctx2d.translate(canvas.width, canvas.height)
      ctx2d.rotate(Math.PI)
      ctx2d.drawImage(img, 0, 0)
      reversedDataUrl = canvas.toDataURL('image/png')
    }

    // Decode the reversed variant into its own <img> too, alongside the
    // upright `img` above — both are kept (not just their dataUrl strings)
    // so later canvas redraws (e.g. baking rounded corners in at final draw
    // time) can drawImage() them synchronously instead of round-tripping
    // through another async decode.
    const reversedElement = reversedDataUrl === dataUrl
      ? img
      : await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Failed to load reversed image for measurement'))
          el.src = reversedDataUrl
        })

    return {
      dataUrl,
      reversedDataUrl,
      element: img,
      reversedElement,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  } catch {
    return null
  }
}

/** Loads every card image in the reading in parallel, keyed by the card's index in reading.cards. Missing/unresolvable cards are skipped (writeCardImagesSection falls back to a placeholder for any index with no entry). */
export async function loadCardImages(data: PdfExportData): Promise<Map<number, LoadedCardImage>> {
    const { reading, cards, selectedDeck } = data
    const result = new Map<number, LoadedCardImage>()

    await Promise.all(
        reading.cards.map(async (cardId, idx) => {
        if (!cardId || !selectedDeck) return
        const card = cards.find(c => c.id === cardId)
        if (!card) return

        const url = `${selectedDeck.images['card-front']}/${card.type.replaceAll(' ', '')}/${card.nameShort}.png`
        const loaded = await loadCardImage(url)
        if (loaded) result.set(idx, loaded)
    })
  )

  return result
}

export function getReadingCardCount(data: PdfExportData): number {
  return data.reading.cards.filter(cardId => !!cardId && data.cards.some(c => c.id === cardId)).length
}
