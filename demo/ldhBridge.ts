// The demo's stand-in for a host server: a Vite dev-server route that sends
// Legal Data Hunter calls with the user's API key.
//
//   browser ── POST /api/ldh/:operation ──▶ this route ── REST + Bearer key ──▶ LDH
//
// The key is read here, in Node, from `LDH_KEY` (shell or `.env.local` at the
// package root). It is never prefixed `VITE_`, so Vite never inlines it into the
// page. Only runs under `npm run demo`; a production build has no such route.

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import {
  LEGAL_DATA_HUNTER_BASE_URL,
  toLegalDataHunterRestRequest,
  type LegalDataHunterOperation,
} from '../src/providers/legalDataHunter'

const OPERATIONS = new Set<LegalDataHunterOperation>([
  'search',
  'document',
  'resolve',
  'countries',
  'sources',
  'filters',
  'report-issue',
])

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => resolve(text))
    request.on('error', reject)
  })
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

export function ldhBridge(): Plugin {
  let key = ''
  let allowIssueReports = false

  return {
    name: 'ldh-bridge',
    apply: 'serve',

    configResolved(config) {
      // The package root, not `demo/` (the Vite root), is where `.env.local` lives.
      const env = { ...loadEnv(config.mode, process.cwd(), ''), ...process.env }
      key = env.LDH_KEY?.trim() ?? ''
      allowIssueReports = env.LDH_ALLOW_ISSUE_REPORTS === '1'
      config.logger.info(
        key
          ? `  ldh-bridge: live, key ${key.slice(0, 5)}… (${key.length} chars)`
          : '  ldh-bridge: no LDH_KEY — discovery works, search/document/resolve will 401',
      )
    },

    configureServer(server) {
      server.middlewares.use('/api/ldh', async (request, response) => {
        // GET /api/ldh/status — lets the page say whether a key is configured.
        const operation = (request.url ?? '').replace(/^\//, '').split('?')[0]
        if (request.method === 'GET' && operation === 'status') {
          return send(response, 200, { keyConfigured: key !== '', allowIssueReports })
        }

        if (request.method !== 'POST') return send(response, 405, { error: 'POST only' })
        if (!OPERATIONS.has(operation as LegalDataHunterOperation)) {
          return send(response, 404, { error: `Unknown operation "${operation}"` })
        }
        if (operation === 'report-issue' && !allowIssueReports) {
          return send(response, 403, {
            error: 'Issue reports file a real ticket with LDH. Set LDH_ALLOW_ISSUE_REPORTS=1 to allow.',
          })
        }

        try {
          const payload = JSON.parse((await readBody(request)) || '{}')
          const rest = toLegalDataHunterRestRequest(operation as LegalDataHunterOperation, payload)
          const started = Date.now()
          const upstream = await fetch(LEGAL_DATA_HUNTER_BASE_URL + rest.path, {
            method: rest.method,
            headers: {
              Accept: 'application/json',
              ...(key ? { Authorization: `Bearer ${key}` } : {}),
              ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: rest.body ? JSON.stringify(rest.body) : undefined,
          })
          const text = await upstream.text()
          server.config.logger.info(
            `  ldh ${rest.method} ${rest.path} → ${upstream.status} (${Date.now() - started} ms)`,
          )

          if (!upstream.ok) {
            return send(response, upstream.status, {
              error: `Legal Data Hunter answered ${upstream.status}`,
              retryAfter: upstream.headers.get('retry-after') ?? undefined,
              detail: text.slice(0, 500),
            })
          }
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json')
          response.end(text)
        } catch (error) {
          send(response, 400, { error: error instanceof Error ? error.message : String(error) })
        }
      })
    },
  }
}
