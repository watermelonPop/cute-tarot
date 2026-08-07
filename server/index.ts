import express from 'express'
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors'
import usersRouter from './routes/users.js'
import cardsRouter from './routes/cards.js'
import decksRouter from './routes/decks.js'
import relationsRouter from './routes/relations.js'
import spreadsRouter from './routes/spreads.js'
import readingsRouter from './routes/readings.js'
import authRouter from './routes/auth.js'
import { prisma } from './lib/prisma.js'

import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express()
const PORT = 3001

// Middleware
app.use(express.json())

app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`)
  next()
})

/*app.use(cors({
  origin: 'http://localhost:5173',
}))*/

/*app.use(cors())*/
app.use(cors({
  origin: 'http://localhost:5173', // or your frontend URL
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/api/users', usersRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/decks', decksRouter)
app.use('/api/relations', relationsRouter)
app.use('/api/spreads', spreadsRouter)
app.use('/api/readings', readingsRouter)
app.use('/api/auth', authRouter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

if (process.env.NODE_ENV !== "production") {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;