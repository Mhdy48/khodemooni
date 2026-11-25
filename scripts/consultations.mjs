import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

export const databasePath = () =>
  process.env.CONSULT_DB || join(homedir(), '.khodemooni', 'consultations.sqlite')

export function openInbox(path = databasePath()) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path)
  db.exec(
    'PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS consultations (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, service TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'
  )
  return db
}

export function receiver(db, allowedOrigin) {
  const rates = new Map()
  const find = db.prepare('SELECT name,phone,service,message FROM consultations WHERE id=?')
  const insert = db.prepare(
    'INSERT INTO consultations(id,name,phone,service,message) VALUES(?,?,?,?,?)'
  )
  return async (req, res) => {
    const reply = (status, body = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    if (req.url !== '/api/consultations') return reply(404)
    const origin = req.headers.origin
    if (origin && origin !== allowedOrigin(req)) return reply(403)
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      return reply(204)
    }
    if (req.method !== 'POST') return reply(405)
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') return reply(415)
    try {
      const chunks = []
      let size = 0
      for await (const chunk of req) {
        size += chunk.length
        if (size > 12000) return reply(413)
        chunks.push(chunk)
      }
      let data
      try {
        data = JSON.parse(Buffer.concat(chunks).toString())
      } catch {
        return reply(400)
      }
      const { id, name, phone, service, message } = data || {}
      if (
        typeof id !== 'string' ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ||
        typeof name !== 'string' ||
        name.trim().length < 3 ||
        name.length > 100 ||
        typeof phone !== 'string' ||
        !/^0[1-9]\d{9}$/.test(phone) ||
        !['personal', 'bulk', 'design', 'fabric'].includes(service) ||
        typeof message !== 'string' ||
        message.length > 1500
      )
        return reply(422)
      const existing = find.get(id)
      if (existing) {
        if (
          existing.name !== name.trim() ||
          existing.phone !== phone ||
          existing.service !== service ||
          existing.message !== message
        )
          return reply(409)
        return reply(200, { id })
      }
      const now = Date.now()
      for (const [key, entry] of rates) if (entry.until <= now) rates.delete(key)
      const key = req.socket.remoteAddress
      const entry = rates.get(key) || { count: 0, until: now + 600000 }
      if (entry.count >= 8) return reply(429)
      insert.run(id, name.trim(), phone, service, message)
      entry.count++
      rates.set(key, entry)
      return reply(201, { id })
    } catch {
      if (!res.headersSent) reply(500)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openInbox()
  if (process.argv.includes('--list')) {
    console.table(
      db
        .prepare(
          'SELECT created_at,name,phone,service,message FROM consultations ORDER BY rowid DESC LIMIT 100'
        )
        .all()
    )
    db.close()
  } else {
    const port = Number(process.env.PORT || 4174)
    const server = createServer(
      receiver(db, () => process.env.CONSULT_SITE_ORIGIN || 'http://127.0.0.1:' + port)
    )
    server.listen(port, '127.0.0.1', () =>
      console.log('Consultation receiver listening on 127.0.0.1:' + port)
    )
  }
}
