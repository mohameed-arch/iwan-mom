// In-memory rate limiter — 10 requests per minute per IP.
// Best-effort for serverless (resets on cold starts), but prevents burst abuse within a warm instance.
const ipWindows = new Map()

function isRateLimited(ip) {
  const now = Date.now()
  const windowMs = 60 * 1000
  const max = 10

  if (!ipWindows.has(ip)) ipWindows.set(ip, [])
  const timestamps = ipWindows.get(ip).filter(t => now - t < windowMs)
  timestamps.push(now)
  ipWindows.set(ip, timestamps)
  return timestamps.length > max
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — max 10 per minute per IP. Please wait and try again.' })
  }

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
}
