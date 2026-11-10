#!/usr/bin/env node
// One-shot page for handing the LDH key over from a phone, over Tailscale.
//
//   node scripts/receive-ldh-key.mjs [tailscale-ip]
//
// Binds only to this machine's Tailscale address, so only your tailnet can
// reach it and the traffic is WireGuard-encrypted. The URL carries a random
// one-time token. It accepts one key, writes it through set-ldh-key.sh, and
// exits; it also exits after 10 minutes. The key is never printed or logged.

import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const host = process.argv[2] ?? execFileSync('tailscale', ['ip', '-4'], { encoding: 'utf8' }).trim().split('\n')[0]
if (!host.startsWith('100.')) {
  console.error(`Refusing to bind to ${host}: not a Tailscale address.`)
  process.exit(1)
}

const token = randomBytes(18).toString('base64url')
const port = 8765
const TIMEOUT_MS = 10 * 60 * 1000

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LDH key</title><style>
body{font:17px -apple-system,system-ui,sans-serif;margin:2rem auto;max-width:28rem;padding:0 1rem}
input,button{font:inherit;width:100%;box-sizing:border-box;padding:.8rem;margin:.5rem 0;border-radius:.5rem;border:1px solid #999}
button{background:#111;color:#fff;border:0}</style></head><body>${body}</body></html>`

const form = page(`<h1>Legal Data Hunter key</h1>
<p>Paste the key (starts with <code>sk-</code>). It is written to <code>.env.local</code> on the computer and this page closes.</p>
<form method="post" autocomplete="off">
<input name="key" type="password" placeholder="sk-…" required autofocus autocapitalize="off" autocorrect="off" spellcheck="false">
<button>Save key</button></form>`)

let done = false
const server = createServer((req, res) => {
  const path = (req.url ?? '').split('?')[0]
  if (path !== `/${token}` || done) {
    res.writeHead(404).end('Not found')
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(form)
    return
  }
  if (req.method !== 'POST') {
    res.writeHead(405).end()
    return
  }

  let body = ''
  req.setEncoding('utf8')
  req.on('data', (chunk) => {
    body += chunk
    if (body.length > 4096) req.destroy()
  })
  req.on('end', () => {
    const key = new URLSearchParams(body).get('key')?.trim() ?? ''
    const result = spawnSync('sh', [join(here, 'set-ldh-key.sh')], { input: key + '\n', encoding: 'utf8' })
    if (result.status !== 0) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(page(`<p>${result.stderr.trim() || 'Could not save.'}</p><p><a href="/${token}">Try again</a></p>`))
      return
    }
    done = true
    console.log(result.stdout.trim())
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end(page('<h1>Saved.</h1><p>You can close this page and delete the key from your clipboard.</p>'))
    setTimeout(() => process.exit(0), 500)
  })
})

server.listen(port, host, () => {
  console.log(`Open on the iPhone (Tailscale on): http://${host}:${port}/${token}`)
  console.log('Accepts one key, then exits. Expires in 10 minutes.')
})
setTimeout(() => {
  console.log('Expired without a key.')
  process.exit(1)
}, TIMEOUT_MS).unref()
