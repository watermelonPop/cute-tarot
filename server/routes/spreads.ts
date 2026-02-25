import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyJWT, attachUser, requireAdmin } from '../src/middleware/auth.js'

const router = Router()

// GET /api/spreads
router.get('/', async (_req, res) => {
  const spreads = await prisma.spread.findMany({
    })
  res.json(spreads)
})

// GET /api/spreads/cards/:numPulls
router.get('/cards/:numPulls', async (req, res) => {
  const numPulls = Number(req.params.numPulls);
  
  const spreads = await prisma.spread.findMany({
    where: {
      numPulls,
    },
  })
  res.json(spreads)
})

// GET /api/spreads/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Spread ID parameter is required' });
    }

    const spread = await prisma.spread.findUnique({
      where: { id },
    });

    if (!spread) {
      return res.status(404).json({ error: `Spread with id ${id} not found` });
    }

    res.json(spread);
  } catch (err) {
    console.error(`GET /api/spreads/${req.params.id} failed:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/spreads/:id/updateSpread
router.post(
  '/:spreadId/updateSpread',
  verifyJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { spreadId } = req.params as { spreadId: string };
      const { description } = req.body as { description?: string };

      const updatedSpread = await prisma.spread.update({
        where: { id: spreadId },
        data: {
          description,
        },
      });

      res.status(200).json(updatedSpread);
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Spread not found' });
      }

      console.error(
        `POST /api/spreads/${req.params.spreadId}/updateSpread failed:`,
        err
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router
