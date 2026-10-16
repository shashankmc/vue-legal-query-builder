// A runtime provider for the demo.
//
// The manifest and the request/response mapping come from the package itself
// (`legalDataHunterManifest`, `createLegalDataHunterAdapter`); only the
// transport is local. That is the point: a real host swaps `call` for a fetch to
// its own server, which holds the key — nothing else here changes.

import {
  createLegalDataHunterAdapter,
  legalDataHunterManifest,
  type LegalDataHunterOperation,
  type QueryBuilderManifestV3,
} from '../src'

/** The shipped LDH manifest, plus two providers the demo wants to show. */
export const runtimeManifest: QueryBuilderManifestV3 = {
  ...legalDataHunterManifest,
  providers: [
    ...(legalDataHunterManifest.providers ?? []),
    {
      id: 'caselawexplorer',
      label: 'Case Law Explorer',
      type: 'case-law',
      description: 'The built-in RS / ECHR API.',
      transport: { searchEndpoint: '/api/legal-docs/search' },
    },
    {
      id: 'cjeu',
      label: 'CJEU',
      type: 'cjeu',
      disabled: true,
      unavailableReason: 'No backing endpoint yet.',
    },
  ],
}

const countries = [
  { code: 'FR', case_law_sources: 3, legislation_sources: 1, total_documents: 1_850_000 },
  { code: 'DE', case_law_sources: 2, total_documents: 920_000 },
  { code: 'EU', legislation_sources: 4, total_documents: 245_000 },
]

const sourcesByCountry: Record<string, unknown[]> = {
  FR: [
    { source_id: 'FR/Judilibre', data_type: 'case_law', court_name: 'Cour de cassation', tier: 1, document_count: 520_000 },
    { source_id: 'FR/CNIL', data_type: 'doctrine', court_name: 'CNIL', tier: 1, document_count: 12_000 },
  ],
  DE: [{ source_id: 'DE/BGH', data_type: 'case_law', court_name: 'Bundesgerichtshof', tier: 1, document_count: 185_000 }],
  EU: [{ source_id: 'EU/EUR-Lex', data_type: 'legislation', court_name: 'EUR-Lex', tier: 1, document_count: 245_000 }],
}

const filtersBySource: Record<string, unknown> = {
  'FR/Judilibre': {
    courts: ['Cour de cassation', "Cour d'appel"],
    languages: ['fr'],
    decision_types: ['arrêt', 'ordonnance'],
    court_tiers: [1, 2, 3],
    date_range: { min: '1790-01-01', max: '2026-04-01' },
  },
  'FR/CNIL': { courts: ['CNIL'], languages: ['fr'] },
  'DE/BGH': { courts: ['Bundesgerichtshof'], languages: ['de'] },
  'EU/EUR-Lex': { languages: ['en', 'fr'] },
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Stands in for the host's server-side MCP bridge: it takes an operation and
 * returns the provider's raw payload. A real host would fetch here.
 */
async function call(operation: LegalDataHunterOperation, payload: Record<string, unknown>) {
  await delay(160)

  switch (operation) {
    case 'countries':
      return { countries }

    case 'sources': {
      const country = payload.country as string | undefined
      if (!country) return { sources: Object.values(sourcesByCountry).flat() }
      return { sources: sourcesByCountry[country] ?? [] }
    }

    case 'filters':
      return filtersBySource[String(payload.source)] ?? {}

    case 'search': {
      const args = payload.args as Record<string, unknown>
      if (args.query === 'boom') throw new Error('Provider said no.')

      const hits = [1, 2].map((index) => ({
        source: 'FR/Judilibre',
        source_id: `JURITEXT00000000${index}`,
        score: 0.9 - index / 10,
        title: `Sample decision ${index}`,
        snippet: '…factual summary…',
        url: `https://example.org/decision/${index}`,
        country: (args.country as string[] | undefined)?.[0] ?? 'FR',
        language: 'fr',
        court: 'Cour de cassation',
        court_tier: 1,
        ecli: `ECLI:FR:CCASS:2022:C10043${index}`,
        case_number: `21-12.53${index}`,
        date: '2022-05-12',
      }))

      return { query: args.query, total_hits: hits.length, elapsed_ms: 160, hits }
    }

    case 'document':
      return {
        source: payload.source,
        source_id: payload.source_id,
        title: 'Sample decision',
        text: 'LA COUR … [full text]',
        url: 'https://example.org/decision/1',
      }

    case 'resolve':
      return {
        match_type: 'exact',
        documents: [
          {
            source: 'FR/Judilibre',
            source_id: 'JURITEXT000000001',
            title: 'Sample decision',
          },
        ],
      }

    default:
      return {}
  }
}

export const runtimeAdapter = createLegalDataHunterAdapter({ call })
