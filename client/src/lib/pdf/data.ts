import type { Reading, Card, Spread, Relation, Deck } from '../../types'

// --- Top-level content data ---------------------------------------------

export interface PdfExportData {
  reading: Reading
  cards: Card[]
  spreads: Spread[]
  relations: Relation[]
  selectedDeck: Deck | null
}
