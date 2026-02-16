import express from 'express'
import cors from 'cors'
import usersRouter from './routes/users.js'
import cardsRouter from './routes/cards.js'
import decksRouter from './routes/decks.js'
import relationsRouter from './routes/relations.js'
import spreadsRouter from './routes/spreads.js'
import readingsRouter from './routes/readings.js'
import { prisma } from './lib/prisma.js'

const app = express()
const PORT = 3001

// Middleware
app.use(express.json())

/*app.use(cors({
  origin: 'http://localhost:5173',
}))*/

app.use(cors())

app.use('/api/users', usersRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/decks', decksRouter)
app.use('/api/relations', relationsRouter)
app.use('/api/spreads', spreadsRouter)
app.use('/api/readings', readingsRouter)

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