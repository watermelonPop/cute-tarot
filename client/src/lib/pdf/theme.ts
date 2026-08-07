import type { Deck } from '../../types'
import { getDeckTheme } from '../../types'
import { remToMm } from './units'

// --- Theme (per-deck colors, resolved at export time) -----------------------

export interface Theme {
  sectionHeadingColor: [number, number, number]
  sectionHeadingBorderColor: [number, number, number]
  subHeadingBg: [number, number, number]
  subHeadingText: [number, number, number]
  reversedReminderBg: [number, number, number]
  reversedReminderText: [number, number, number]
  borderRadiusSmallMm: number
}

/**
 * Resolves any CSS color value (hex or keyword like "white"/"black") to an
 * RGB triple by letting the browser itself do the parsing, via a throwaway
 * element's computed style — this guarantees the PDF matches exactly what
 * the live page renders for the same value, rather than us maintaining a
 * separate hex/keyword parser that could drift out of sync.
 */
export function colorToRgb(value: string): [number, number, number] {
  const probe = document.createElement('div')
  probe.style.color = value
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).color // "rgb(r, g, b)"
  document.body.removeChild(probe)
  const match = computed.match(/\d+/g)
  if (!match || match.length < 3) return [0, 0, 0]
  return [Number(match[0]), Number(match[1]), Number(match[2])]
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16)
  if (Number.isNaN(bigint)) return [255, 235, 59] // fallback: a reasonable default highlight yellow
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

export function applyOpacity(rgb: [number, number, number], opacity: number, backgroundRgb: [number, number, number] = [255, 255, 255]): [number, number, number] {
  return [
    Math.round(rgb[0] * opacity + backgroundRgb[0] * (1 - opacity)),
    Math.round(rgb[1] * opacity + backgroundRgb[1] * (1 - opacity)),
    Math.round(rgb[2] * opacity + backgroundRgb[2] * (1 - opacity)),
  ]
}

/** Builds the color/geometry theme for whichever deck is selected at export time — this is why it's computed fresh per export rather than a module-level constant. */
export function buildTheme(selectedDeck: Deck | null): Theme {
  // getDeckTheme (types.ts) is the static name -> theme lookup that used to
  // live in Deck.style in the DB — always a complete object, so there's no
  // fallback-per-key needed here anymore, only its own name-not-found
  // fallback inside getDeckTheme itself.
  const style = getDeckTheme(selectedDeck?.name)

  const borderRadiusSmallRem = parseFloat(style['border-radius-small']) || 0.5
  const accentBg = colorToRgb(style['accent-background'])
  const accentText = colorToRgb(style['accent-text'])

  return {
    sectionHeadingColor: colorToRgb("#000000"),
    sectionHeadingBorderColor: colorToRgb(style['secondary-background']),
    subHeadingBg: accentBg,
    subHeadingText: accentText,
    reversedReminderBg: accentBg,
    reversedReminderText: accentText,
    borderRadiusSmallMm: remToMm(borderRadiusSmallRem),
  }
}
