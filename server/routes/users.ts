import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifyJWT, requireAdmin, requireSameUser } from '../src/middleware/auth.js'

const router = Router()

// GET /api/users
router.get(
  '/',
  verifyJWT,
  requireAdmin,
  async (_req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          type: true,
          name: true,
        },
      });

      res.json(users);
    } catch (err) {
      console.error('GET /api/users failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/users/check
router.get(
  '/check',
  verifyJWT,
  requireSameUser('id'),
  async (req, res) => {
    res.json({
      exists: true,
      user_id: req.dbUser!.id,
    });
  }
);

// GET /api/users/:id
router.get(
  '/:id',
  verifyJWT,
  requireSameUser('id'),
  async (req, res) => {
    try {
      const { id } = req.params as { id?: string };

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'User ID parameter is required' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({ error: `User with ID ${id} not found` });
      }

      res.json(user);
    } catch (err) {
      console.error(`GET /api/users/${req.params.id} failed:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { email, name, picture } = req.body as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required and must be a string' });
    }

    // Optional: basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find default deck
    const deck = await prisma.deck.findFirst({
      where: { name: "Rider–Waite" },
      select: { id: true }, // only need id
    });

    if (!deck) {
      return res.status(500).json({ error: 'Default deck not found' });
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        picture,
        readings: [], // empty list by default
        selectedDeck: deck.id,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/setDeck
router.post(
  '/setDeck',
  verifyJWT,
  requireSameUser('userId'),
  async (req, res) => {
    try {
      const body = req.body as { userId?: string; deckId?: string };
      const { userId, deckId } = body;

      if (!userId || !deckId) {
        return res.status(400).json({ error: 'userId and deckId are required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { selectedDeck: deckId },
      });

      res.status(200).json(updatedUser);
    } catch (err) {
      console.error('POST /api/users/setDeck failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


export default router
