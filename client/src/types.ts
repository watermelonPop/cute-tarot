export interface User {
    id: string
    email: string
    name: string
    picture: string
    readings: String[]
    selectedDeck: String
    type: string
}

export interface Card {
    id: string
    type: string
    value: number
    name: string
    nameShort: string
    meaningUp: string
    meaningRev: string
    keywordsUp: string
    keywordsRev: string
    meaningAdvice: string
    meaningLove: string
    meaningCareer: string
    meaningYesNo: string
    // keys = deck IDs, values = description strings
    descriptions: Record<string, string>;
}

export interface Deck {
    id: string
    name: string
    // keys = card IDs (or "card-back"), values = image path strings
    images: Record<string, string>
    description: string
}

/** A deck's full set of CSS custom-property values (colors + radii). */
export interface Theme {
    'main-background': string
    'main-text': string
    'secondary-background': string
    'secondary-text': string
    'accent-background': string
    'accent-text': string
    'border-radius': string
    'border-radius-small': string
}

// Deck themes used to live in the DB (Deck.style), fetched per-deck at
// request time. They're static design decisions, not data, so they live
// here now instead — looked up by deck name via getDeckTheme below.
const DECK_THEMES: Record<string, Theme> = {
    'Rider–Waite': {
        'main-background': '#231942',
        'main-text': '#FFFFFF',
        'secondary-background': '#5E548E',
        'secondary-text': '#000000',
        'accent-background': '#E0B1CB',
        'accent-text': '#000000',
        'border-radius': '1rem',
        'border-radius-small': '0.5rem',
    },
    'Bunny–Waite': {
        'main-background': '#FCF7EB',
        'main-text': '#000000',
        'secondary-background': '#4C202D',
        'secondary-text': '#FCF7EB',
        'accent-background': '#FD9F9F',
        'accent-text': '#000000',
        'border-radius': '1rem',
        'border-radius-small': '0.5rem',
    },
}

// Same values as the Rider–Waite entry above — mirrors the :root fallback
// in App.css, used when a deck's name has no matching theme.
const DEFAULT_THEME: Theme = DECK_THEMES['Rider–Waite']

/**
 * Looks up a deck's theme by name. Deck names elsewhere in the app get their
 * en/em dashes normalized to a plain hyphen for route matching (e.g.
 * "Rider–Waite" -> "Rider-Waite") — normalize the same way here so a lookup
 * works regardless of which form the caller has on hand.
 */
export function getDeckTheme(deckName: string | undefined | null): Theme {
    if (!deckName) return DEFAULT_THEME
    const normalized = deckName.replace(/[–—]/g, '-')
    const match = Object.entries(DECK_THEMES).find(
        ([name]) => name.replace(/[–—]/g, '-') === normalized
    )
    return match?.[1] ?? DEFAULT_THEME
}

export interface Relation {
    id: string
    cards: string[]
    description: string
    descriptionAdvice: string
    descriptionLove: string
    descriptionCareer: string
}

export type HideMode = 'none' | 'strikethrough' | 'hidden';

/**
 * A single text annotation anchored to one text block within a reading.
 *
 * Anchoring: `startOffset`/`endOffset` are plain-character offsets into the
 * raw string identified by `targetId` (e.g. "cardDesc0", "relationDesc2").
 * `text` is a snapshot of the selected text at creation time. The source
 * string itself is expected to stay stable per reading (card descriptions
 * are resolved against the deck pinned to the reading, not the currently
 * equipped one), so offsets are trusted as-is rather than re-validated.
 *
 * `note` implies a highlight is present — always set `highlightColor` when
 * setting `note` (see createAnnotation, which enforces this).
 */
export interface Annotation {
    id: string
    targetId: string
    startOffset: number
    endOffset: number
    text: string
    hideMode: HideMode
    highlightColor?: string
    note?: string
    createdAt: string // ISO timestamp; tie-breaker for stacking order on overlap
}

/**
 * A fully-resolved, non-overlapping slice of a text block after merging all
 * overlapping annotations that cover it. Produced by buildAnnotationSegments.
 */
export interface AnnotationSegment {
    text: string
    startOffset: number
    endOffset: number
    annotationIds: string[]
    completelyHidden: boolean
    struckThrough: boolean
    highlightColor?: string
    notes: string[]
}

export interface Reading {
    id: string
    name?: string
    date: string
    cards: string[]
    reversalValues: boolean[]
    spread: string
    relations: string[]
    reversals: boolean
    topic: string
    notes?: string
    annotations: Annotation[]
    deckId: string
}

export interface Spread {
    id: string
    name: string
    description: string
    pulls: string[]
    numPulls: number
}

export type Topic = "General" | "Love & Relationships" | "Advice" | "Career";

export type DrawingMethod = 'Manual' | 'Virtual';

export type Suit = 'Any' | 'Major Arcana' | 'Swords' | 'Cups' | 'Wands' | 'Coins';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const ALL_SUITS: Exclude<Suit, 'Any'>[] = ['Major Arcana', 'Wands', 'Cups', 'Coins', 'Swords'];

export function isValidSuit(value: string): value is Exclude<Suit, 'Any'> {
    return (ALL_SUITS as string[]).includes(value);
}