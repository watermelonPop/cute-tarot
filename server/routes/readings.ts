import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { Prisma } from '@prisma/client';
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { verifyJWT, requireReadingOwnership, requireAdmin } from '../src/middleware/auth.js'

const router = Router()

// GET /api/readings
router.get(
  '/',
  verifyJWT,
  async (req, res) => {
    try {
      // Always use authenticated user
      const userId = req.dbUser!.id;

      // We already have the user loaded from attachUser
      const readings = req.dbUser!.readings;

      res.json(readings);
    } catch (err) {
      console.error('GET /api/readings failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


// GET /api/readings/:id
router.get(
  '/:id',
  verifyJWT,
  requireReadingOwnership("id"),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const reading = await prisma.reading.findUnique({
        where: { id },
        include: { annotations: true },
      });

      if (!reading) {
        return res.status(404).json({ error: 'Reading not found' });
      }

      res.json(reading);
    } catch (err) {
      console.error(`GET /api/readings/${req.params.id} failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/readings/draw
router.post(
  '/draw',
  verifyJWT,
  async (req, res) => {
    try {
      const body = req.body as {
        spreadId?: string;
        reversals?: boolean | string;
        topic?: string;
        name?: string;
        deckId?: string;
      };

      const { spreadId, topic, name, deckId } = body;
      let { reversals } = body;

      const userId = req.dbUser!.id; // ✅ comes from verified token

      if (!spreadId) {
        return res.status(400).json({ error: 'Spread ID is required' });
      }

      if (!deckId) {
        return res.status(400).json({ error: 'Deck ID is required' });
      }

      // Convert reversals string to boolean if necessary
      if (typeof reversals === 'string') {
        reversals = reversals.toLowerCase() === 'true';
      }

      // Fetch spread only (user is already authenticated)
      const spread = await prisma.spread.findUnique({
        where: { id: spreadId },
      });

      if (!spread) {
        return res.status(404).json({ error: 'Spread not found' });
      }

      const numDrawn = spread.pulls.length;
      const numCardsInDeck = await prisma.card.count();

      const drawnCards: string[] = [];
      const isReversed: boolean[] = [];
      const usedCardIds = new Set<string>();

      // Draw unique random cards
      while (drawnCards.length < numDrawn) {
        const randomIndex = Math.floor(Math.random() * numCardsInDeck);
        const cardCode = "ar" + String(randomIndex).padStart(2, "0");

        const card = await prisma.card.findUnique({
          where: { nameShort: cardCode },
        });

        if (!card) continue;
        if (usedCardIds.has(card.id)) continue;

        usedCardIds.add(card.id);
        drawnCards.push(card.id);
        isReversed.push(Math.random() < 0.5);
      }

      // Generate all 2-card combinations
      const combinations: [string, string][] = [];
      for (let i = 0; i < drawnCards.length; i++) {
        for (let j = i + 1; j < drawnCards.length; j++) {
          combinations.push([drawnCards[i], drawnCards[j]]);
        }
      }

      const orFilters = combinations.map(([id1, id2]) => ({
        cards: { hasEvery: [id1, id2] },
      }));

      const relations = await prisma.relation.findMany({
        where: { OR: orFilters },
      });

      const relationIds = relations.map(r => r.id);

      const finalReversals = reversals ? isReversed : [];

      // Create reading
      const reading = await prisma.reading.create({
        data: {
          name: name ?? "Untitled Reading",
          spread: spreadId,
          reversals: !!reversals,
          topic: topic ?? '',
          cards: drawnCards,
          reversalValues: finalReversals,
          relations: relationIds,
          deckId,
        },
        include: { annotations: true },
      });

      // Push reading to authenticated user
      await prisma.user.update({
        where: { id: userId },
        data: { readings: { push: reading.id } },
      });

      res.status(201).json(reading);
    } catch (err) {
      console.error('POST /api/readings/draw failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/readings/:id/updateNotes
router.post(
  '/:id/updateNotes',
  verifyJWT,
  requireReadingOwnership("id"),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body as { notes?: string };

      if (notes === undefined || notes === null) {
        return res.status(400).json({ error: 'Updated notes is required' });
      }

      const updated = await prisma.reading.update({
        where: { id },
        data: { notes },
        include: { annotations: true },
      });

      return res.status(200).json(updated);
    } catch (err) {
      console.error(`POST /api/readings/${req.params.id}/updateNotes failed:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/readings
router.post(
  '/',
  verifyJWT,
  async (req, res) => {
    try {
      const body = req.body as {
        date?: string;
        name?: string;
        spreadId?: string;
        reversals?: boolean | string;
        topic?: string;
        cardIds?: string[];
        reversalValues?: boolean[];
        deckId?: string;
      };

      const {
        spreadId,
        topic,
        cardIds,
        reversalValues,
        deckId,
      } = body;

      let { reversals, name, date } = body;

      // ✅ Always use authenticated user
      const userId = req.dbUser!.id;

      // Ensure date exists and is valid
      const readingDate = date ? new Date(date) : new Date();

      if (!name) {
        name = `Untitled ${readingDate.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        })}`;
      }

      if (!spreadId) {
        return res.status(400).json({ error: 'Spread ID is required' });
      }

      if (!deckId) {
        return res.status(400).json({ error: 'Deck ID is required' });
      }

      if (!cardIds || cardIds.length === 0) {
        return res.status(400).json({ error: 'cardIds array is required' });
      }

      // Convert string → boolean if needed
      if (typeof reversals === 'string') {
        reversals = reversals.toLowerCase() === 'true';
      }

      if (reversals && !reversalValues) {
        return res.status(400).json({
          error: 'Reversal values required when reversals is true',
        });
      }

      // Fetch spread only (no need to fetch user anymore)
      const spread = await prisma.spread.findUnique({
        where: { id: spreadId },
      });

      if (!spread) {
        return res.status(404).json({ error: 'Spread not found' });
      }

      const numDrawn = spread.pulls.length;

      if (
        cardIds.length !== numDrawn ||
        (reversals && reversalValues!.length !== numDrawn)
      ) {
        return res.status(400).json({
          error: 'Number of cards and reversal values must match the spread',
        });
      }

      // Generate 2-card combinations
      const combinations: [string, string][] = [];
      for (let i = 0; i < cardIds.length; i++) {
        for (let j = i + 1; j < cardIds.length; j++) {
          combinations.push([cardIds[i], cardIds[j]]);
        }
      }

      const relations = await prisma.relation.findMany({
        where: {
          OR: combinations.map(([a, b]) => ({
            cards: { hasEvery: [a, b] },
          })),
        },
      });

      const relationIds = relations.map(r => r.id);

      const reading = await prisma.reading.create({
        data: {
          name,
          date: readingDate,
          spread: spreadId,
          reversals: !!reversals,
          topic: topic ?? '',
          cards: cardIds,
          reversalValues: reversalValues ?? [],
          relations: relationIds,
          deckId,
        },
        include: { annotations: true },
      });

      // Attach reading to authenticated user
      await prisma.user.update({
        where: { id: userId },
        data: { readings: { push: reading.id } },
      });

      res.status(201).json(reading);
    } catch (err) {
      console.error('POST /api/readings failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/readings/:id/annotations
router.post(
  '/:id/annotations', 
  verifyJWT,
  requireReadingOwnership("id"),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { id: annotationId, targetId, startOffset, endOffset, text, hideMode, highlightColor, note, createdAt } = req.body;

    if (!targetId || startOffset == null || endOffset == null || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing required annotation fields' });
    }

    await prisma.annotation.create({
      data: {
        id: annotationId,
        readingId: id,
        targetId,
        startOffset,
        endOffset,
        text,
        hideMode,
        highlightColor: highlightColor ?? null,
        note: note ?? null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });

    const updatedReading = await prisma.reading.findUnique({
      where: { id },
      include: { annotations: true },
    });

    res.json(updatedReading);
  } catch (err) {
    console.error('POST /api/readings/:id/annotations failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/readings/:id/annotations/:annotationId
router.patch(
  '/:id/annotations/:annotationId',
  verifyJWT,
  requireReadingOwnership("id"),
  async (req, res) => {
    try {
      const { id, annotationId } = req.params as { id: string; annotationId: string };
      const { targetId, startOffset, endOffset, text, hideMode, highlightColor, note } = req.body;

      const existing = await prisma.annotation.findUnique({ where: { id: annotationId } });

      if (!existing || existing.readingId !== id) {
        return res.status(404).json({ error: 'Annotation not found' });
      }

      await prisma.annotation.update({
        where: { id: annotationId },
        data: { 
          targetId, 
          startOffset, 
          endOffset, 
          text, 
          hideMode, 
          highlightColor: highlightColor ?? null, 
          note: note ?? null,
        },
      });

      const updatedReading = await prisma.reading.findUnique({
        where: { id },
        include: { annotations: true },
      });

      res.json(updatedReading);
    } catch (err) {
      console.error(`PATCH /api/readings/${req.params.id}/annotations/${req.params.annotationId} failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/readings/:id/annotations/:annotationId
router.delete(
  '/:id/annotations/:annotationId',
  verifyJWT,
  requireReadingOwnership("id"),
  async (req, res) => {
    try {
      const { id, annotationId } = req.params as { id: string; annotationId: string };

      const existing = await prisma.annotation.findUnique({ where: { id: annotationId } });

      if (!existing || existing.readingId !== id) {
        return res.status(404).json({ error: 'Annotation not found' });
      }

      await prisma.annotation.delete({ where: { id: annotationId } });

      const updatedReading = await prisma.reading.findUnique({
        where: { id },
        include: { annotations: true },
      });

      res.json(updatedReading);
    } catch (err) {
      console.error(`DELETE /api/readings/${req.params.id}/annotations/${req.params.annotationId} failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/readings/:readingId
router.delete(
  '/:readingId',
  verifyJWT,
  requireReadingOwnership("readingId"),
  async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { readingId } = req.params;

    if (!readingId?.trim()) {
      res.status(400).json({ error: 'Reading ID is required' });
      return;
    }

    try {
      const { userId } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }


      //remove reading from user's readings
      if (user.readings.includes(readingId)) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            readings: {
              set: user.readings.filter(id => id !== readingId),
            },
          },
        });
      }

      //delete reading
      await prisma.reading.delete({
        where: { id: readingId }
      });

      res.status(204).send();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025 is thrown by Prisma when the record to delete doesn't exist
        if (err.code === 'P2025') {
          res.status(404).json({ error: `Reading '${readingId}' not found` });
          return;
        }
      }

      next(err);
    }
  }
);


export default router
