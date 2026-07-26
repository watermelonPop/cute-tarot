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
    style: Record<string, string>;
}

export interface Relation {
    id: string
    cards: string[]
    description: string
    descriptionAdvice: string
    descriptionLove: string
    descriptionCareer: string
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