const express = require('express')
const rateLimit = require('express-rate-limit')
const path = require('path')

const app = express()
app.use(express.json({ limit: '2mb' }))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — max 10 per minute per IP. Please wait and try again.' },
})

app.post('/api/proxy', limiter, async (req, res) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(400).json({ error: 'No API key provided' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(5000, '0.0.0.0', () => console.log('Server running on :5000'))
