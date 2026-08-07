declare global {
  interface Window {
    jspdf?: { jsPDF: new (options: Record<string, unknown>) => JsPdfInstance }
  }
}

export interface JsPdfInstance {
  internal: {
    pageSize: { getWidth: () => number; getHeight: () => number }
    getNumberOfPages: () => number
  }
  addPage: () => JsPdfInstance
  save: (filename: string) => void
  setFont: (font: string, style?: string) => JsPdfInstance
  setFontSize: (size: number) => JsPdfInstance
  setTextColor: (r: number, g: number, b: number) => JsPdfInstance
  setFillColor: (r: number, g: number, b: number) => JsPdfInstance
  setDrawColor: (r: number, g: number, b: number) => JsPdfInstance
  setLineWidth: (w: number) => JsPdfInstance
  setPage: (page: number) => JsPdfInstance
  addImage: (data: string, format: string, x: number, y: number, width: number, height: number, alias?: string, compression?: string, rotation?: number) => JsPdfInstance
  text: (text: string, x: number, y: number) => JsPdfInstance
  getTextWidth: (text: string) => number
  rect: (x: number, y: number, w: number, h: number, style?: string) => JsPdfInstance
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => JsPdfInstance
  line: (x1: number, y1: number, x2: number, y2: number) => JsPdfInstance
  link: (x: number, y: number, w: number, h: number, options: { pageNumber: number }) => JsPdfInstance
}

let loadPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

export function loadPdfLibraries(): Promise<void> {
  if (window.jspdf) return Promise.resolve()
  if (!loadPromise) {
    loadPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(() => undefined)
  }
  return loadPromise
}
