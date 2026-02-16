import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /api/users
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    })
  res.json(users)
})

// GET /api/users/check?email=
router.get('/check', async (req, res) => {
  try {
    const { email } = req.query as { email?: string };

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }

    // Optional: basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }, // only select id since that's all we need
    });

    const response: { exists: boolean; user_id?: string } = {
      exists: !!user,
      user_id: user?.id,
    };

    res.json(response);
  } catch (err) {
    console.error(`GET /api/users/check failed:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
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
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { email, name, picture } = req.body as {
      email?: string;
      name?: string;
      picture?: string;
    };

    console.log('req.body:', req.body);

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
router.post('/setDeck', async (req, res) => {
  try {
    const { userId, deckId } = req.body;

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
});


export default router