// Legal Data Hunter, described once.
//
// Three things live here, all of them pure:
//
//   1. the manifest a form renders — providers, databases and their fields;
//   2. the mapping from a collected request to what the `search` tool takes;
//   3. the mapping from a provider response to the normalized shapes the UI
//      reads.
//
// There is no client here and no credential. `createLegalDataHunterAdapter`
// takes a `call` function the host supplies — normally a fetch to the host's own
// server, which is where the LDH key lives and where the MCP bridge runs. That
// keeps this package's rule intact: it builds a request and hands it back, it
// never makes one.

import type {
  DiscoveryOption,
  LegalSearchAdapter,
  NormalizedLegalDocument,
  NormalizedSearchHit,
  NormalizedSearchResult,
  ProviderFilterSet,
  ProviderSearchRequest,
  QueryBuilderManifestV3,
  ResolvedLegalReference,
  SourceIssueType,
} from 'legal-retrieval-types'

export const LEGAL_DATA_HUNTER_PROVIDER_ID = 'ldh'

/** The corpora Legal Data Hunter searches. */
export const LEGAL_DATA_HUNTER_NAMESPACES = ['case_law', 'legislation', 'doctrine'] as const
export type LegalDataHunterNamespace = (typeof LEGAL_DATA_HUNTER_NAMESPACES)[number]

/** The operations a host bridge is asked to perform. */
export type LegalDataHunterOperation =
  | 'search'
  | 'document'
  | 'resolve'
  | 'countries'
  | 'sources'
  | 'filters'
  | 'report-issue'

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

/**
 * The manifest a form renders for Legal Data Hunter: one provider, the three
 * corpora it exposes, and the search parameters the `search` tool accepts.
 *
 * The credential is *declared* here, never carried; a host reads
 * `methods[].dependencies` to render the field and to write an operator
 * scaffold. See the README's Credentials section.
 */
export const legalDataHunterManifest: QueryBuilderManifestV3 = {
  schemaVersion: '3',
  defaultProvider: LEGAL_DATA_HUNTER_PROVIDER_ID,
  defaultDatabase: 'case-law',
  providers: [
    {
      id: LEGAL_DATA_HUNTER_PROVIDER_ID,
      label: 'Legal Data Hunter',
      type: 'legal-data-hunter',
      description: 'Tens of millions of primary-source documents across 230+ jurisdictions.',
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
  ],
  databases: [
    {
      id: 'case-law',
      label: 'Case law',
      provider: LEGAL_DATA_HUNTER_PROVIDER_ID,
      kind: 'case-law',
      description: 'Court decisions, supreme to first instance.',
      namespaces: ['case_law'],
      defaultResultView: { kind: 'ranked-list' },
      fields: [
        {
          key: 'query',
          control: 'text',
          label: 'Query',
          required: true,
          minLength: 2,
          maxLength: 500,
          placeholder: 'e.g. right to be forgotten',
        },
        {
          key: 'country',
          control: 'multiselect',
          label: 'Countries',
          userConfigurable: true,
          description: 'Filled from the country picker above.',
        },
        {
          key: 'source',
          control: 'multiselect',
          label: 'Sources',
          advanced: true,
          userConfigurable: true,
          description: 'Filled from the source picker above.',
        },
        {
          key: 'court',
          control: 'remote-select',
          label: 'Court',
          advanced: true,
          userConfigurable: true,
          description: 'Offered once a source is chosen.',
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
        { key: 'jurisdiction', control: 'text', label: 'Jurisdiction', advanced: true, userConfigurable: true },
        { key: 'subdivision', control: 'text', label: 'Subdivision', advanced: true, userConfigurable: true },
        { key: 'language', control: 'remote-select', label: 'Language', advanced: true, userConfigurable: true },
        { key: 'date_start', control: 'date', label: 'Decided from', advanced: true, userConfigurable: true },
        { key: 'date_end', control: 'date', label: 'Decided to', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10, userConfigurable: true },
        {
          key: 'alpha',
          control: 'range',
          label: 'Semantic weight',
          min: 0,
          max: 1,
          step: 0.1,
          defaultValue: 0.7,
          description: '1 is pure semantic similarity, 0 is pure keyword matching.',
          advanced: true,
          userConfigurable: true,
        },
      ],
    },
    {
      id: 'legislation',
      label: 'Legislation',
      provider: LEGAL_DATA_HUNTER_PROVIDER_ID,
      kind: 'legislation',
      description: 'Codes, statutes, decrees and EU instruments.',
      namespaces: ['legislation'],
      defaultResultView: { kind: 'ranked-list' },
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true, minLength: 2, placeholder: 'e.g. personal data protection' },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
        { key: 'source', control: 'multiselect', label: 'Sources', advanced: true, userConfigurable: true },
        { key: 'document_type', control: 'remote-select', label: 'Document type', advanced: true, userConfigurable: true },
        { key: 'language', control: 'remote-select', label: 'Language', advanced: true, userConfigurable: true },
        { key: 'date_start', control: 'date', label: 'In force from', advanced: true, userConfigurable: true },
        { key: 'date_end', control: 'date', label: 'In force to', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10, userConfigurable: true },
        {
          key: 'alpha',
          control: 'range',
          label: 'Semantic weight',
          min: 0,
          max: 1,
          step: 0.1,
          defaultValue: 0.9,
          advanced: true,
          userConfigurable: true,
        },
      ],
    },
    {
      id: 'doctrine',
      label: 'Doctrine',
      provider: LEGAL_DATA_HUNTER_PROVIDER_ID,
      kind: 'doctrine',
      description: 'Regulator decisions and official commentary.',
      namespaces: ['doctrine'],
      defaultResultView: { kind: 'ranked-list' },
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true, minLength: 2 },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
        { key: 'source', control: 'multiselect', label: 'Sources', advanced: true, userConfigurable: true },
        { key: 'language', control: 'remote-select', label: 'Language', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10, userConfigurable: true },
      ],
    },
  ],
  resultViews: [{ kind: 'ranked-list' }, { kind: 'table' }],
  features: { allowFieldCustomization: true, showAdvancedFields: false, emitProvenance: true },
}

/** The namespace a database maps to, when the manifest names one. */
export function namespaceForDatabase(
  manifest: QueryBuilderManifestV3,
  databaseId: string,
): string | undefined {
  return manifest.databases?.find((entry) => entry.id === databaseId)?.namespaces?.[0]
}

// ---------------------------------------------------------------------------
// Request mapping
// ---------------------------------------------------------------------------

/**
 * The arguments the `search` tool accepts, in MCP shape.
 *
 * The REST endpoint takes the same set with `q` where this has `query`; that
 * single rename belongs to the bridge, not to the form.
 */
export interface LegalDataHunterSearchArgs {
  query: string
  namespace?: string
  top_k?: number
  alpha?: number
  country?: string[]
  source?: string[]
  court?: string
  court_tier?: number
  jurisdiction?: string
  subdivision?: string
  language?: string
  date_start?: string
  date_end?: string
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function asList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.map(String).filter((entry) => entry !== '')
  return list.length > 0 ? list : undefined
}

/**
 * Turns a collected form request into the `search` tool's arguments. Absent
 * values are omitted rather than sent empty, so the provider sees only what the
 * user actually chose.
 *
 * `courtTier` maps to `court_tier` and is sent as a number; the form collects it
 * as a string because an HTML select gives strings.
 */
export function toLegalDataHunterSearchArgs(
  request: ProviderSearchRequest,
): LegalDataHunterSearchArgs {
  const params = request.params

  const args: LegalDataHunterSearchArgs = {
    query: asText(params.query) ?? '',
    namespace: asText(params.namespace),
    top_k: asNumber(params.top_k),
    alpha: asNumber(params.alpha),
    country: asList(params.country),
    source: asList(params.source),
    court: asText(params.court),
    court_tier: asNumber(params.court_tier ?? params.courtTier),
    jurisdiction: asText(params.jurisdiction),
    subdivision: asText(params.subdivision),
    language: asText(params.language),
    date_start: asText(params.date_start),
    date_end: asText(params.date_end),
  }

  return Object.fromEntries(
    Object.entries(args).filter(([, value]) => value !== undefined),
  ) as LegalDataHunterSearchArgs
}

/** The reference-resolution arguments, in MCP shape. */
export interface LegalDataHunterResolveArgs {
  reference: string
  hint_country?: string
  hint_type?: string
}

export function toLegalDataHunterResolveArgs(input: {
  reference: string
  hintCountry?: string
  hintType?: string
}): LegalDataHunterResolveArgs {
  return Object.fromEntries(
    Object.entries({
      reference: input.reference,
      hint_country: asText(input.hintCountry),
      hint_type: asText(input.hintType),
    }).filter(([, value]) => value !== undefined),
  ) as unknown as LegalDataHunterResolveArgs
}

export interface LegalDataHunterIssueArgs {
  source: string
  issue_type: SourceIssueType
  description?: string
}

export function toLegalDataHunterIssueArgs(input: {
  source: string
  issueType: SourceIssueType
  description?: string
}): LegalDataHunterIssueArgs {
  return Object.fromEntries(
    Object.entries({
      source: input.source,
      issue_type: input.issueType,
      description: asText(input.description),
    }).filter(([, value]) => value !== undefined),
  ) as unknown as LegalDataHunterIssueArgs
}

// ---------------------------------------------------------------------------
// Response normalization
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** The context a normalized hit needs, which the provider response lacks. */
export interface LegalDataHunterContext {
  provider: string
  database: string
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** One provider hit, normalized to the shape the UI reads. */
export function normalizeLegalDataHunterHit(
  raw: unknown,
  context: LegalDataHunterContext,
): NormalizedSearchHit {
  const hit = isRecord(raw) ? raw : {}
  const sourceId = typeof hit.source_id === 'string' ? hit.source_id : ''
  const source = typeof hit.source === 'string' ? hit.source : ''

  return {
    id: sourceId !== '' ? `${source}/${sourceId}` : String(hit.id ?? ''),
    provider: context.provider,
    database: context.database,
    source,
    sourceId,
    title: typeof hit.title === 'string' ? hit.title : '',
    snippet:
      typeof hit.snippet === 'string'
        ? hit.snippet
        : typeof hit.text === 'string'
          ? hit.text
          : undefined,
    score: numberOrUndefined(hit.score),
    url: typeof hit.url === 'string' ? hit.url : undefined,
    date: typeof hit.date === 'string' ? hit.date : undefined,
    country: typeof hit.country === 'string' ? hit.country : undefined,
    language: typeof hit.language === 'string' ? hit.language : undefined,
    // Source-specific fields the shared shape has no slot for. Kept whole so a
    // host view can show anything the provider sends.
    metadata: {
      ...(typeof hit.court === 'string' ? { court: hit.court } : {}),
      ...(typeof hit.chamber === 'string' ? { chamber: hit.chamber } : {}),
      ...(typeof hit.jurisdiction === 'string' ? { jurisdiction: hit.jurisdiction } : {}),
      ...(typeof hit.court_tier === 'number' ? { courtTier: hit.court_tier } : {}),
      ...(typeof hit.ecli === 'string' ? { ecli: hit.ecli } : {}),
      ...(typeof hit.case_number === 'string' ? { caseNumber: hit.case_number } : {}),
      ...(typeof hit.decision_type === 'string' ? { decisionType: hit.decision_type } : {}),
      ...(hit.text_unavailable === true ? { textUnavailable: true } : {}),
      ...(hit.text_truncated === true ? { textTruncated: true } : {}),
    },
    raw,
  }
}

/**
 * A search response, normalized. Accepts the documented `{ hits, total_hits, … }`
 * envelope and degrades gracefully when part of it is missing.
 */
export function normalizeLegalDataHunterSearch(
  raw: unknown,
  context: LegalDataHunterContext,
): NormalizedSearchResult {
  const response = isRecord(raw) ? raw : {}
  const hits = asArray(response.hits).map((hit) => normalizeLegalDataHunterHit(hit, context))

  const warnings: string[] = []
  if (hits.some((hit) => hit.metadata.textUnavailable === true)) {
    warnings.push('Full text was unavailable for some results.')
  }

  return {
    provider: context.provider,
    database: context.database,
    query: typeof response.query === 'string' ? response.query : undefined,
    hits,
    totalHits: numberOrUndefined(response.total_hits) ?? hits.length,
    partial: hits.some((hit) => hit.metadata.textTruncated === true) || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    cursor: typeof response.cursor === 'string' ? response.cursor : undefined,
    nextCursor: typeof response.next_cursor === 'string' ? response.next_cursor : undefined,
    elapsedMs: numberOrUndefined(response.elapsed_ms),
    raw,
  }
}

/** A document, normalized. */
export function normalizeLegalDataHunterDocument(
  raw: unknown,
  context: LegalDataHunterContext,
): NormalizedLegalDocument {
  const document = isRecord(raw) ? raw : {}
  const source = typeof document.source === 'string' ? document.source : ''
  const sourceId = typeof document.source_id === 'string' ? document.source_id : ''

  return {
    provider: context.provider,
    database: context.database,
    source,
    sourceId,
    title: typeof document.title === 'string' ? document.title : '',
    text: typeof document.text === 'string' ? document.text : undefined,
    textUnavailable: document.text_unavailable === true || document.text === undefined,
    textTruncated: document.text_truncated === true,
    fullTextSize: numberOrUndefined(document.full_text_size),
    url: typeof document.url === 'string' ? document.url : undefined,
    date: typeof document.date === 'string' ? document.date : undefined,
    country: typeof document.country === 'string' ? document.country : undefined,
    language: typeof document.language === 'string' ? document.language : undefined,
    metadata: {
      ...(typeof document.data_type === 'string' ? { dataType: document.data_type } : {}),
      ...(typeof document.court === 'string' ? { court: document.court } : {}),
      ...(typeof document.ecli === 'string' ? { ecli: document.ecli } : {}),
      ...(typeof document.case_number === 'string' ? { caseNumber: document.case_number } : {}),
      ...(isRecord(document.meta) ? { source: document.meta } : {}),
    },
    raw,
  }
}

/** Countries, as discovery options. */
export function normalizeLegalDataHunterCountries(raw: unknown): DiscoveryOption[] {
  const response = isRecord(raw) ? raw : {}
  return asArray(response.countries)
    .map((entry): DiscoveryOption | null => {
      if (!isRecord(entry) || typeof entry.code !== 'string') return null
      const total = numberOrUndefined(entry.total_documents)
      return {
        value: entry.code,
        // The API gives a code, not a name — the code is what a search takes,
        // so it is what the field stores.
        label: entry.code,
        count: total,
        description:
          total !== undefined
            ? `${total.toLocaleString()} documents`
            : undefined,
        metadata: {
          caseLawSources: entry.case_law_sources,
          legislationSources: entry.legislation_sources,
          doctrineSources: entry.doctrine_sources,
        },
      }
    })
    .filter((entry): entry is DiscoveryOption => entry !== null)
}

/** Sources for a country, as discovery options. */
export function normalizeLegalDataHunterSources(raw: unknown): DiscoveryOption[] {
  const response = isRecord(raw) ? raw : {}
  return asArray(response.sources)
    .map((entry): DiscoveryOption | null => {
      if (!isRecord(entry) || typeof entry.source_id !== 'string') return null
      const court = typeof entry.court_name === 'string' ? entry.court_name : undefined
      return {
        value: entry.source_id,
        label: court ?? entry.source_id,
        description: typeof entry.notes === 'string' ? entry.notes : undefined,
        count: numberOrUndefined(entry.document_count),
        metadata: {
          dataType: entry.data_type,
          tier: entry.tier,
          dateRange: entry.date_range,
        },
      }
    })
    .filter((entry): entry is DiscoveryOption => entry !== null)
}

/** A source's filter values, as a `ProviderFilterSet`. */
export function normalizeLegalDataHunterFilters(
  raw: unknown,
  source: string,
): ProviderFilterSet {
  const response = isRecord(raw) ? raw : {}

  const options = (value: unknown): DiscoveryOption[] | undefined => {
    if (asArray(value).length === 0) return undefined
    return asArray(value)
      .map((entry): DiscoveryOption | null => {
        // Filters come back as strings, but court tiers are numbers.
        if (typeof entry === 'string') return { value: entry, label: entry }
        if (typeof entry === 'number') return { value: String(entry), label: String(entry) }
        if (isRecord(entry) && typeof entry.value === 'string') {
          return { value: entry.value, label: typeof entry.label === 'string' ? entry.label : entry.value }
        }
        return null
      })
      .filter((entry): entry is DiscoveryOption => entry !== null)
  }

  const dateRange = isRecord(response.date_range) ? response.date_range : undefined

  return {
    source,
    courts: options(response.courts),
    jurisdictions: options(response.jurisdictions),
    chambers: options(response.chambers),
    decisionTypes: options(response.decision_types),
    languages: options(response.languages),
    courtTiers: options(response.court_tiers),
    subdivisions: options(response.subdivisions),
    dateRange: dateRange
      ? {
          min: typeof dateRange.min === 'string' ? dateRange.min : undefined,
          max: typeof dateRange.max === 'string' ? dateRange.max : undefined,
        }
      : undefined,
    raw,
  }
}

/**
 * A resolved citation, normalized. The resolver returns matched document(s) with
 * a `match_type`; the envelope is tolerated rather than assumed.
 */
export function normalizeLegalDataHunterResolvedReference(
  raw: unknown,
  context: LegalDataHunterContext & { reference: string },
): ResolvedLegalReference {
  const response = isRecord(raw) ? raw : {}

  const candidates = asArray(response.hits ?? response.documents ?? response.results)
  const hits = candidates.map((entry) => normalizeLegalDataHunterHit(entry, context))

  const matchType =
    typeof response.match_type === 'string'
      ? response.match_type
      : hits.length > 1
        ? 'ambiguous'
        : hits.length === 1
          ? 'exact'
          : 'fallback_search'

  return {
    reference: typeof response.reference === 'string' ? response.reference : context.reference,
    matchType,
    hits,
    raw,
  }
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface LegalDataHunterAdapterOptions {
  /**
   * Sends one operation to the host's server-side bridge. This is the only
   * thing that talks to anything; the host points it at its own server, which
   * holds the key. No HTTP client and no credential live in this package.
   */
  call: (
    operation: LegalDataHunterOperation,
    payload: Record<string, unknown>,
  ) => Promise<unknown>
  /** The manifest to resolve namespaces from. Defaults to the shipped one. */
  manifest?: QueryBuilderManifestV3
}

/**
 * An adapter that maps the generic request shapes onto Legal Data Hunter's and
 * the provider's responses back onto the normalized ones. Compose it with the
 * host's `call`.
 */
export function createLegalDataHunterAdapter(
  options: LegalDataHunterAdapterOptions,
): LegalSearchAdapter {
  const manifest = options.manifest ?? legalDataHunterManifest

  return {
    async search(request) {
      const args = toLegalDataHunterSearchArgs({
        ...request,
        params: {
          ...request.params,
          namespace: namespaceForDatabase(manifest, request.database),
        },
      })
      const raw = await options.call('search', { args })
      return normalizeLegalDataHunterSearch(raw, {
        provider: request.provider,
        database: request.database,
      })
    },

    async getDocument(request) {
      const raw = await options.call('document', {
        source: request.source,
        source_id: request.sourceId,
      })
      return normalizeLegalDataHunterDocument(raw, {
        provider: request.provider,
        database: request.database,
      })
    },

    async resolveReference(request) {
      const raw = await options.call('resolve', {
        args: toLegalDataHunterResolveArgs(request),
      })
      return [
        normalizeLegalDataHunterResolvedReference(raw, {
          provider: request.provider,
          database: request.database,
          reference: request.reference,
        }),
      ]
    },

    async discoverCountries() {
      const raw = await options.call('countries', {})
      return normalizeLegalDataHunterCountries(raw)
    },

    async discoverSources(request) {
      const raw = await options.call('sources', {
        country: request.country,
        namespace: namespaceForDatabase(manifest, request.database ?? ''),
      })
      return normalizeLegalDataHunterSources(raw)
    },

    async getFilters(request) {
      const raw = await options.call('filters', {
        source: request.source,
        namespace: namespaceForDatabase(manifest, request.database ?? ''),
      })
      return normalizeLegalDataHunterFilters(raw, request.source)
    },

    async reportSourceIssue(request) {
      await options.call('report-issue', {
        args: toLegalDataHunterIssueArgs(request),
      })
    },
  }
}
