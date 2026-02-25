import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Authorization code is required' });

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    }).then(r => r.json());

    if (!tokenResponse.id_token) {
      return res.status(400).json({ error: 'Failed to get ID token from Google' });
    }

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokenResponse.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: 'Google ID token missing email' });

    // Upsert user in our DB
    const deck = await prisma.deck.findFirst({ where: { name: 'Rider–Waite' }, select: { id: true } });
    if (!deck) return res.status(500).json({ error: 'Default deck not found' });

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        name: payload.name,
        picture: payload.picture,
      },
      create: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        readings: [],
        selectedDeck: deck.id,
        type: 'General User',
      },
    });

    // Generate our backend JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (err) {
    console.error('POST /auth/google failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;