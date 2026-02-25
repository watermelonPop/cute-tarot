import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyJWT, requireAdmin } from '../src/middleware/auth.js'

const router = Router()

// GET /api/cards
router.get('/', async (_req, res) => {
    const cards = await prisma.card.findMany({
      orderBy: {
        value: 'asc',
      },
    })
    res.json(cards)
})

// GET /api/cards/namesShort
router.get('/namesShort', async (_req, res) => {
    const cards = await prisma.card.findMany({
        select: {
            nameShort: true
        }
    })
    const names = cards.map(card => card.nameShort)
    res.json(names)
})

// GET /api/cards/search?query=...
router.get('/search', async (req, res) => {
  try {
    const queryParam = req.query.query;

    if (typeof queryParam !== 'string' || queryParam.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter is required and must be a non-empty string' });
    }

    const query = queryParam.trim();

    // 1️⃣ Find all cards that match any string field
    const textMatches = await prisma.card.findMany({
      where: {
        OR: [
          { type: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { meaningUp: { contains: query, mode: 'insensitive' } },
          { meaningRev: { contains: query, mode: 'insensitive' } },
          { keywordsUp: { contains: query, mode: 'insensitive' } },
          { keywordsRev: { contains: query, mode: 'insensitive' } },
          { meaningAdvice: { contains: query, mode: 'insensitive' } },
          { meaningLove: { contains: query, mode: 'insensitive' } },
          { meaningCareer: { contains: query, mode: 'insensitive' } },
          { meaningYesNo: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    // 2️⃣ Also check JSON descriptions (in-memory filter fallback)
    const allCards = await prisma.card.findMany({
      select: {
        id: true,
        descriptions: true,
      },
    });

    const loweredQuery = query.toLowerCase();

    const descriptionMatches = allCards
      .filter(card => {
        if (!card.descriptions || typeof card.descriptions !== 'object') return false;

        return Object.values(card.descriptions).some(val => {
          if (typeof val !== 'string') return false;
          return val.toLowerCase().includes(loweredQuery);
        });
      })
      .map(card => card.id);

    // 3️⃣ Merge and remove duplicates by ID
    const uniqueIds = new Set<string>([
      ...textMatches.map(c => c.id),
      ...descriptionMatches,
    ]);

    if (uniqueIds.size === 0) {
      return res.json([]);
    }

    const uniqueResults = await prisma.card.findMany({
      where: {
        id: { in: Array.from(uniqueIds) },
      },
    });

    res.json(uniqueResults);
  } catch (err) {
    console.error('GET /api/cards/search failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /api/cards/:nameShort
router.get('/:nameShort', async (req, res) => {
  try {
    const { nameShort } = req.params;

    if (typeof nameShort !== 'string' || nameShort.trim().length === 0) {
      return res.status(400).json({ error: 'nameShort parameter is required' });
    }

    const card = await prisma.card.findUnique({
      where: { nameShort: nameShort.trim() },
    });

    if (!card) {
      return res.status(404).json({ error: `Card not found for nameShort: ${nameShort}` });
    }

    res.json(card);
  } catch (err) {
    console.error('GET /api/cards/:nameShort failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const ALL_CARD_CODES: string[] = (() => {
  const cards: string[] = [];

  // Major Arcana
  for (let i = 0; i <= 21; i++) {
    cards.push(`ar${String(i).padStart(2, '0')}`);
  }

  // Minor Arcana helper
  const addSuit = (prefix: string) => {
    cards.push(`${prefix}ac`);

    for (let i = 2; i <= 10; i++) {
      cards.push(`${prefix}${String(i).padStart(2, '0')}`);
    }

    cards.push(`${prefix}pa`);
    cards.push(`${prefix}kn`);
    cards.push(`${prefix}qu`);
    cards.push(`${prefix}ki`);
  };

  addSuit('sw'); // Swords
  addSuit('cu'); // Cups
  addSuit('wa'); // Wands
  addSuit('pe'); // Coins / Pentacles

  return cards;
})();



// GET /api/cards/draw/:numDrawn/:reversed
router.get('/draw/:numDrawn/:reversed', async (req, res) => {
  try {
    const { numDrawn, reversed } = req.params;

    // Validate numDrawn
    const drawCount = Number(numDrawn);
    if (!Number.isInteger(drawCount) || drawCount <= 0) {
      return res.status(400).json({ error: 'numDrawn must be a positive integer' });
    }

    // Coerce reversed to boolean
    const includeReversals =
      typeof reversed === 'string' && reversed.toLowerCase() === 'true';

    const numCardsInDeck = await prisma.card.count();
    if (numCardsInDeck === 0) {
      return res.status(500).json({ error: 'No cards available in deck' });
    }

    if (drawCount > numCardsInDeck) {
      return res.status(400).json({
        error: `Cannot draw ${drawCount} unique cards from a deck of ${numCardsInDeck}`,
      });
    }

    const drawnCards: string[] = [];
    const isReversed: boolean[] = [];
    const usedCardIds = new Set<string>();

    // Safety cap to avoid infinite loops if data is weird
    const maxAttempts = drawCount * 10;
    let attempts = 0;

    while (drawnCards.length < drawCount) {
      if (attempts++ > maxAttempts) {
        return res.status(500).json({
          error: 'Failed to draw unique cards after many attempts',
        });
      }

      const currRandom = Math.floor(Math.random() * ALL_CARD_CODES.length);
      const currNameShort = ALL_CARD_CODES[currRandom];

      const isRev = Math.random() < 0.5;

      const currCard = await prisma.card.findUnique({
        where: { nameShort: currNameShort },
      });

      if (!currCard) continue;

      if (usedCardIds.has(currCard.id)) {
        continue;
      }

      usedCardIds.add(currCard.id);
      drawnCards.push(currCard.id);
      isReversed.push(isRev);
    }

    const payload: {
      cards: string[];
      reversed?: boolean[];
    } = {
      cards: drawnCards,
    };

    if (includeReversals) {
      payload.reversed = isReversed;
    }

    res.json(payload);
  } catch (err) {
    console.error('GET /api/cards/draw/:numDrawn/:reversed failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cards/:cardId/updateCard
router.post(
  '/:cardId/updateCard', 
  verifyJWT,
  requireAdmin,
  async (req, res) => {
  const { cardId } = req.params;
  try {
    const {meaningUp, meaningRev, keywordsUp, keywordsRev, meaningAdvice, meaningLove, meaningCareer,  meaningYesNo, descriptions } = req.body;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { 
        meaningUp, 
        meaningRev, 
        keywordsUp, 
        keywordsRev, 
        meaningAdvice, 
        meaningLove, 
        meaningCareer,  
        meaningYesNo, 
        descriptions 
      },
    });

    res.status(200).json(updatedCard);
  } catch (err) {
    console.error('POST /api/cards/:id/updateCard failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router