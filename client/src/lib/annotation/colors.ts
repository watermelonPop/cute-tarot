const DARKEN_STEP = 0.15
const MAX_DARKEN_STEPS = 4

export const HIGHLIGHT_COLORS: { label: string; value: string }[] = [
  { label: 'Yellow', value: '#E6C160' },
  { label: 'Green', value: '#92C686' },
  { label: 'Blue', value: '#6492B8' },
  { label: 'Pink', value: '#FD9F9F' },
  { label: 'Red', value: '#FF6E6D' },
  { label: 'Purple', value: '#BFA5E2' },
]

export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].value

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized
  const bigint = parseInt(full, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b]
    .map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
    .join('')
}

function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const factor = 1 - amount
  return rgbToHex([r * factor, g * factor, b * factor])
}

function blendColors(colors: string[]): string {
  const rgbs = colors.map(hexToRgb)
  const sum = rgbs.reduce((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0])
  return rgbToHex(sum.map(c => c / rgbs.length) as [number, number, number])
}

/**
 * Resolves the display color for a stack of overlapping highlight colors.
 * Same color repeated -> progressively darkened. Different colors -> blended
 * (average) across the distinct set.
 */
export function resolveHighlightColor(colors: string[]): string | undefined {
  if (colors.length === 0) return undefined

  const unique = Array.from(new Set(colors))
  if (unique.length === 1) {
    const extraLayers = Math.min(colors.length - 1, MAX_DARKEN_STEPS)
    return extraLayers === 0 ? unique[0] : darkenColor(unique[0], extraLayers * DARKEN_STEP)
  }

  return blendColors(unique)
}