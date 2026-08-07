import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyJWT, requireAdmin } from '../src/middleware/auth.js'


const router = Router()

// GET /api/decks
router.get('/', async (_req, res) => {
  try {
    const decks = await prisma.deck.findMany()
    res.json(decks)
  } catch (err) {
    console.error('GET /api/decks failed:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/decks/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Deck id is required' });
    }

    const deck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    res.json(deck);
  } catch (err) {
    console.error('GET /api/decks/:id failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/decks/:id/images
router.get('/:id/images', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Deck id is required' });
    }

    const deck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (!deck.images || typeof deck.images !== 'object') {
      return res.status(500).json({ error: 'Deck images are not configured properly' });
    }

    const shortCards = await prisma.card.findMany({
      select: { nameShort: true },
    });

    const shortNames = shortCards.map(card => card.nameShort);

    const images: Record<string, string | undefined> = {};

    const cardBack = (deck.images as Record<string, string>)['card-back'];
    const cardFrontBase = (deck.images as Record<string, string>)['card-front'];

    if (!cardBack || !cardFrontBase) {
      return res.status(500).json({
        error: 'Deck image base paths are missing',
      });
    }

    images['card-back'] = cardBack;

    for (const cardCode of shortNames) {
      images[cardCode] = `${cardFrontBase}/MajorArcana/${cardCode}.png`;
    }

    res.json(images);
  } catch (err) {
    console.error('GET /api/decks/:id/images failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/decks/:id/updateDeck
router.post(
  '/:deckId/updateDeck', 
  verifyJWT,
  requireAdmin,
  async (req, res) => {
  const { deckId } = req.params;
  try {
    const { description } = req.body;

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const updatedDeck = await prisma.deck.update({
      where: { id: deckId },
      data: {
        description,
      },
    });

    res.status(200).json(updatedDeck);
  } catch (err) {
    console.error('POST /api/decks/:id/updateDeck failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router