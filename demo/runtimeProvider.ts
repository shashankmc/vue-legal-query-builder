// A runtime provider for the demo: a v3 manifest plus an in-memory adapter.
//
// The real package never calls a provider, and neither does the demo. This
// stands in for the server-side bridge a real host would run — the same shape
// of calls, kept in memory so the demo works with no token and no network.

import type {
  DiscoveryOption,
  LegalSearchAdapter,
  QueryBuilderManifestV3,
} from '../src'

export const runtimeManifest: QueryBuilderManifestV3 = {
  schemaVersion: '3',
  defaultProvider: 'ldh',
  defaultDatabase: 'case-law',
  providers: [
    {
      id: 'ldh',
      label: 'Legal Data Hunter',
      type: 'legal-data-hunter',
      description: '38M+ documents across 230+ jurisdictions.',
      defaultDatabase: 'case-law',
      capabilities: {
        operations: [
          'search',
          'getDocument',
          'resolveReference',
          'discoverCountries',
          'discoverSources',
          'getFilters',
        ],
        supportsDiscovery: true,
        supportsFullText: true,
        supportsPagination: true,
      },
      // The credential is DECLARED, never carried. A host (e.g. legal-blocks)
      // reads this to render the field and to write credentials.json / an env
      // var; the value is only ever used by the server-side bridge.
      methods: [
        {
          id: 'search',
          label: 'Hybrid semantic + keyword search',
          dependencies: [
            {
              id: 'ldh-key',
              label: 'Legal Data Hunter API key',
              kind: 'credential',
              configKeys: ['LDH_KEY'],
              description:
                'A token from your Legal Data Hunter account page. An environment variable wins over a stored value.',
            },
          ],
        },
      ],
    },
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
  databases: [
    {
      id: 'case-law',
      label: 'Case law',
      provider: 'ldh',
      kind: 'case-law',
      description: 'Court decisions, supreme to first instance.',
      namespaces: ['case_law'],
      defaultResultView: { kind: 'ranked-list' },
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true, minLength: 3, maxLength: 200, placeholder: 'e.g. droit à l oubli' },
        {
          key: 'country',
          control: 'multiselect',
          label: 'Countries',
          userConfigurable: true,
          options: [
            { value: 'FR', label: 'France' },
            { value: 'DE', label: 'Germany' },
            { value: 'EU', label: 'European Union' },
          ],
        },
        {
          key: 'court',
          control: 'remote-select',
          label: 'Court',
          advanced: true,
          userConfigurable: true,
          description: 'Filled from the chosen source.',
        },
        {
          key: 'courtTier',
          control: 'select',
          label: 'Court tier',
          advanced: true,
          userConfigurable: true,
          options: [
            { value: '1', label: 'Supreme' },
            { value: '2', label: 'Appellate' },
            { value: '3', label: 'First instance' },
          ],
        },
        {
          key: 'language',
          control: 'select',
          label: 'Language',
          advanced: true,
          userConfigurable: true,
        },
        { key: 'date_start', control: 'date', label: 'Decided from', advanced: true, userConfigurable: true },
        { key: 'date_end', control: 'date', label: 'Decided to', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10 },
        { key: 'alpha', control: 'range', label: 'Semantic weight', min: 0, max: 1, step: 0.1, defaultValue: 0.7 },
      ],
    },
    {
      id: 'legislation',
      label: 'Legislation',
      provider: 'ldh',
      kind: 'legislation',
      description: 'Codes, statutes, decrees and EU instruments.',
      namespaces: ['legislation'],
      defaultResultView: { kind: 'ranked-list' },
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true, placeholder: 'e.g. personal data protection' },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
        { key: 'document_type', control: 'select', label: 'Document type', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10 },
        { key: 'alpha', control: 'range', label: 'Semantic weight', min: 0, max: 1, step: 0.1, defaultValue: 0.9 },
      ],
    },
    {
      id: 'doctrine',
      label: 'Doctrine',
      provider: 'ldh',
      kind: 'doctrine',
      description: 'Regulator decisions and official commentary.',
      namespaces: ['doctrine'],
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
      ],
    },
  ],
  resultViews: [
    { kind: 'ranked-list' },
    { kind: 'table' },
  ],
  features: { allowFieldCustomization: true, showAdvancedFields: false },
}

const countries: DiscoveryOption[] = [
  { value: 'FR', label: 'France', count: 1_850_000 },
  { value: 'DE', label: 'Germany', count: 920_000 },
  { value: 'EU', label: 'European Union', count: 245_000 },
]

const sourcesByCountry: Record<string, DiscoveryOption[]> = {
  FR: [
    { value: 'FR/Judilibre', label: 'Judilibre', description: 'Cour de cassation and cours d appel' },
    { value: 'FR/CNIL', label: 'CNIL', description: 'Data-protection regulator' },
  ],
  DE: [{ value: 'DE/BGH', label: 'Bundesgerichtshof' }],
  EU: [{ value: 'EU/EUR-Lex', label: 'EUR-Lex', description: 'Consolidated EU law' }],
}

const filtersBySource: Record<string, Record<string, DiscoveryOption[]>> = {
  'FR/Judilibre': {
    courts: [
      { value: 'Cour de cassation', label: 'Cour de cassation', count: 520_000 },
      { value: "Cour d'appel", label: "Cour d'appel", count: 310_000 },
    ],
    languages: [{ value: 'fr', label: 'French' }],
  },
  'FR/CNIL': {
    courts: [{ value: 'CNIL', label: 'CNIL', count: 12_000 }],
    languages: [{ value: 'fr', label: 'French' }],
  },
  'DE/BGH': {
    courts: [{ value: 'Bundesgerichtshof', label: 'Bundesgerichtshof', count: 185_000 }],
    languages: [{ value: 'de', label: 'German' }],
  },
  'EU/EUR-Lex': {
    languages: [
      { value: 'en', label: 'English' },
      { value: 'fr', label: 'French' },
    ],
  },
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Stands in for the host's server-side MCP bridge. */
export const runtimeAdapter: LegalSearchAdapter = {
  async discoverCountries() {
    await delay(120)
    return countries
  },

  async discoverSources(request) {
    await delay(120)
    if (!request.country) return Object.values(sourcesByCountry).flat()
    return sourcesByCountry[request.country] ?? []
  },

  async getFilters(request) {
    await delay(120)
    return { source: request.source, ...(filtersBySource[request.source] ?? {}) }
  },

  async search(request) {
    await delay(260)

    if (request.params.query === 'boom') {
      throw new Error('Provider said no.')
    }

    const source = Object.values(sourcesByCountry).flat()[0].value
    return {
      provider: request.provider,
      database: request.database,
      query: String(request.params.query ?? ''),
      totalHits: 2,
      elapsedMs: 260,
      hits: [
        {
          id: `${request.database}-001`,
          provider: request.provider,
          database: request.database,
          source,
          sourceId: 'JURITEXT000000001',
          title: 'Sample decision 1',
          snippet: '…factual summary…',
          score: 0.94,
          url: 'https://example.org/decision/1',
          date: '2022-05-12',
          country: 'FR',
          language: 'fr',
          metadata: { court: 'Cour de cassation', ecli: 'ECLI:FR:CCASS:2022:C100438' },
        },
        {
          id: `${request.database}-002`,
          provider: request.provider,
          database: request.database,
          source,
          sourceId: 'JURITEXT000000002',
          title: 'Sample decision 2',
          snippet: '…legal reasoning…',
          score: 0.87,
          url: 'https://example.org/decision/2',
          date: '2021-11-27',
          country: 'FR',
          language: 'fr',
          metadata: { court: 'Cour de cassation' },
        },
      ],
    }
  },

  async getDocument(request) {
    await delay(150)
    return {
      provider: request.provider,
      database: request.database,
      source: request.source,
      sourceId: request.sourceId,
      title: 'Sample decision',
      text: 'LA COUR … [full text]',
      metadata: {},
    }
  },

  async resolveReference(request) {
    await delay(150)
    return [
      {
        reference: request.reference,
        matchType: 'exact',
        hits: [
          {
            id: 'resolved-1',
            provider: request.provider,
            database: request.database,
            source: 'FR/Judilibre',
            sourceId: 'JURITEXT000000001',
            title: 'Sample decision',
            metadata: {},
          },
        ],
      },
    ]
  },

  async reportSourceIssue() {
    await delay(150)
  },
}
