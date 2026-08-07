export function remToMm(rem: number): number {
  const ROOT_FONT_PX = 16 // matches the browser default html { font-size } this app relies on
  const PX_TO_MM = 25.4 / 96
  return rem * ROOT_FONT_PX * PX_TO_MM
}

export function pxToMm(px: number): number {
  return px * 25.4 / 96
}
