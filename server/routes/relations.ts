import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyJWT, requireAdmin, attachUser } from '../src/middleware/auth.js'

const router = Router()

// GET /api/relations
router.get('/', async (_req, res) => {
  try {
    const relations = await prisma.relation.findMany()
    res.json(relations)
  } catch (err) {
    console.error('GET /api/relations failed:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/relations/:id
router.get('/:relationId', async (req, res) => {
  try {
    const { relationId } = req.params;

    if (!relationId || typeof relationId !== 'string') {
      return res.status(400).json({ error: 'Relation ID parameter is required' });
    }

    const relation = await prisma.relation.findUnique({
      where: { id: relationId }
    })

    if (!relation) {
      return res.status(404).json({ error: `Relation with ID ${relationId} not found` });
    }

    res.json(relation)
  } catch (err) {
    console.error(`GET /api/relations/${req.params.relationId} failed:`, err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/relations/cardId/:cardId
router.get('/cardId/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    if (!cardId || typeof cardId !== 'string') {
      return res.status(400).json({ error: 'cardId parameter is required' });
    }

    // Optional: verify the card exists first
    const cardExists = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true },
    });

    if (!cardExists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const relations = await prisma.relation.findMany({
      where: {
        cards: {
          has: cardId, // array contains this card id
        },
      },
    });

    if (relations.length === 0) {
      return res.status(404).json({ error: 'No relations found for this card' });
    }

    res.json(relations);
  } catch (err) {
    console.error('GET /api/relations/cardId/:cardId failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/relations/nameShort/:nameShort
router.get('/nameShort/:nameShort', async (req, res) => {
  try {
    const { nameShort } = req.params;

    if (!nameShort || typeof nameShort !== 'string') {
      return res.status(400).json({ error: 'nameShort parameter is required' });
    }

    const card = await prisma.card.findUnique({
      where: { nameShort },
      select: { id: true, nameShort: true },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const relations = await prisma.relation.findMany({
      where: {
        cards: {
          has: card.id, // array contains this card id
        },
      },
    });

    if (relations.length === 0) {
      return res.status(404).json({
        error: `No relations found for card ${card.nameShort}`,
      });
    }

    res.json(relations);
  } catch (err) {
    console.error('GET /api/relations/nameShort/:nameShort failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /api/relations/nCardRelations
// Body: { cardIds: ["id1", "id2", "id3", ...] }
router.post('/nCardRelations', async (req, res) => {
  try {
    const { cardIds } = req.body as { cardIds?: string[] };

    if (!Array.isArray(cardIds) || cardIds.length < 2) {
      return res
        .status(400)
        .json({ error: 'cardIds must be an array with at least 2 elements' });
    }

    // Optional: validate each cardId is a non-empty string (or UUID format)
    const invalidIds = cardIds.filter(id => typeof id !== 'string' || !id.trim());
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: 'All cardIds must be valid non-empty strings' });
    }

    // Generate all 2-card combinations
    const combinations: [string, string][] = [];
    for (let i = 0; i < cardIds.length; i++) {
      for (let j = i + 1; j < cardIds.length; j++) {
        combinations.push([cardIds[i], cardIds[j]]);
      }
    }

    if (combinations.length === 0) {
      return res.status(200).json([]); // no combinations possible
    }

    // Build OR filters for Prisma
    const orFilters = combinations.map(([id1, id2]) => ({
      cards: { hasEvery: [id1, id2] },
    }));

    const relations = await prisma.relation.findMany({
      where: { OR: orFilters },
    });

    if (relations.length === 0) {
      return res.status(404).json({ error: 'No relations found for provided card IDs' });
    }

    // Return relation IDs only (optional)
    const relationIds = relations.map(r => r.id);

    res.json({ relations, relationIds });
  } catch (err) {
    console.error('POST /api/relations/nCardRelations failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/relations/:relationId/updateRelation
router.post(
  '/:relationId/updateRelation',
  verifyJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { relationId } = req.params as { relationId: string };
      const {
        description,
        descriptionAdvice,
        descriptionLove,
        descriptionCareer,
      } = req.body;

      const updatedRelation = await prisma.relation.update({
        where: { id: relationId },
        data: {
          description,
          descriptionAdvice,
          descriptionLove,
          descriptionCareer,
        },
      });

      res.status(200).json(updatedRelation);
    } catch (err: any) {
      // If relation doesn't exist, Prisma throws
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Relation not found' });
      }

      console.error(
        `POST /api/relations/${req.params.relationId}/updateRelation failed:`,
        err
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


export default router
