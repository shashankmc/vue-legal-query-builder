// Legal Data Hunter, described once.
//
// Three things live here, all of them pure:
//
//   1. the manifest a form renders — providers, databases and their fields;
//   2. the mapping from a collected request to the REST API's request bodies,
//      and from an operation to its REST method and path;
//   3. the mapping from a provider response to the normalized shapes the UI
//      reads.
//
// There is no client here and no credential. `createLegalDataHunterAdapter`
// takes a `call` function the host supplies — normally a fetch to the host's own
// server. That server holds the user's LDH API key (configured as `LDH_KEY`),
// turns the operation into a REST request with `toLegalDataHunterRestRequest`
// and sends it with `Authorization: Bearer <key>`. That keeps this package's
// rule intact: it builds a request and hands it back, it never makes one.

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
import type { ResultFieldDescriptor } from '../components/resultFields'

export const LEGAL_DATA_HUNTER_PROVIDER_ID = 'ldh'

/** The corpora Legal Data Hunter searches. */
export const LEGAL_DATA_HUNTER_NAMESPACES = ['case_law', 'legislation', 'doctrine'] as const
export type LegalDataHunterNamespace = (typeof LEGAL_DATA_HUNTER_NAMESPACES)[number]

/** The operations a host server is asked to perform. */
export type LegalDataHunterOperation =
  | 'search'
  | 'document'
  | 'resolve'
  | 'countries'
  | 'sources'
  | 'filters'
  | 'report-issue'

// ---------------------------------------------------------------------------
// The result fields
// ---------------------------------------------------------------------------

/**
 * Every field a Legal Data Hunter hit can carry, from the `SearchHit` schema in
 * LDH's OpenAPI spec, keyed as the normalized hit holds them (camelCase, in
 * `metadata` unless it is a core slot like `date`).
 *
 * LDH declares one schema for all sources but does not say which fields a
 * source fills, so this is a catalogue, not a column list: a result view shows
 * the entries that are present in at least one hit, in this order. `default`
 * marks the columns shown before the user picks their own.
 */
export const LEGAL_DATA_HUNTER_RESULT_FIELDS: ResultFieldDescriptor[] = [
  { key: 'source', label: 'Source', type: 'code', default: true },
  { key: 'date', label: 'Date', type: 'date', default: true },
  // Case law
  { key: 'court', label: 'Court', type: 'text', default: true },
  { key: 'chamber', label: 'Chamber', type: 'text' },
  { key: 'courtTier', label: 'Court tier', type: 'number' },
  { key: 'caseNumber', label: 'Case number', type: 'code', default: true },
  { key: 'ecli', label: 'ECLI', type: 'code', default: true },
  { key: 'decisionType', label: 'Decision type', type: 'text' },
  { key: 'decisionNumber', label: 'Decision number', type: 'code' },
  { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
  // Legislation and doctrine
  { key: 'documentType', label: 'Document type', type: 'text', default: true },
  { key: 'authority', label: 'Authority', type: 'text', default: true },
  { key: 'status', label: 'Status', type: 'text', default: true },
  { key: 'effectiveDate', label: 'In force from', type: 'date', default: true },
  { key: 'expiryDate', label: 'In force until', type: 'date' },
  { key: 'identifier', label: 'Identifier', type: 'code' },
  { key: 'eliUri', label: 'ELI', type: 'url' },
  // Any corpus
  { key: 'summary', label: 'Summary', type: 'longtext' },
  { key: 'country', label: 'Country', type: 'code' },
  { key: 'language', label: 'Language', type: 'code' },
  { key: 'unitType', label: 'Unit', type: 'text' },
  { key: 'unitNumber', label: 'Unit number', type: 'code' },
  { key: 'canonicalPath', label: 'Path', type: 'text' },
  { key: 'parentSourceId', label: 'Parent document', type: 'code' },
  { key: 'granularity', label: 'Granularity', type: 'text' },
  { key: 'qualityTier', label: 'Quality tier', type: 'text' },
  { key: 'fullTextSize', label: 'Full text size', type: 'number' },
]

const LEGAL_DATA_HUNTER_RESULT_VIEW = {
  kind: 'ranked-list',
  config: { fields: LEGAL_DATA_HUNTER_RESULT_FIELDS },
}

/** The `result_detail` choice, offered on every corpus. */
const RESULT_DETAIL_FIELD = {
  key: 'result_detail',
  control: 'select' as const,
  label: 'Detail per result',
  advanced: true,
  userConfigurable: true,
  description: 'Full metadata adds fields such as summary, ELI and status where the source has them.',
  options: [
    { value: 'snippet', label: 'Snippet (default)' },
    { value: 'summary_only', label: 'Summary' },
    { value: 'full_metadata', label: 'Full metadata' },
    { value: 'full_text', label: 'Full text' },
  ],
}

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
          'reportSourceIssue',
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
      defaultResultView: LEGAL_DATA_HUNTER_RESULT_VIEW,
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
        { key: 'language', control: 'remote-select', label: 'Language', advanced: true, userConfigurable: true },
        { key: 'date_start', control: 'date', label: 'Decided from', advanced: true, userConfigurable: true },
        { key: 'date_end', control: 'date', label: 'Decided to', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10, userConfigurable: true },
        RESULT_DETAIL_FIELD,
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
      defaultResultView: LEGAL_DATA_HUNTER_RESULT_VIEW,
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true, minLength: 2, placeholder: 'e.g. personal data protection' },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
        { key: 'source', control: 'multiselect', label: 'Sources', advanced: true, userConfigurable: true },
        { key: 'document_type', control: 'remote-select', label: 'Document type', advanced: true, userConfigurable: true },
        { key: 'language', control: 'remote-select', label: 'Language', advanced: true, userConfigurable: true },
        { key: 'date_start', control: 'date', label: 'In force from', advanced: true, userConfigurable: true },
        { key: 'date_end', control: 'date', label: 'In force to', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10, userConfigurable: true },
        RESULT_DETAIL_FIELD,
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
      defaultResultView: LEGAL_DATA_HUNTER_RESULT_VIEW,
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true, minLength: 2 },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
        { key: 'source', control: 'multiselect', label: 'Sources', advanced: true, userConfigurable: true },
        { key: 'language', control: 'remote-select', label: 'Language', advanced: true, userConfigurable: true },
        { key: 'top_k', control: 'number', label: 'Results', min: 1, max: 100, defaultValue: 10, userConfigurable: true },
        RESULT_DETAIL_FIELD,
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
 * The JSON body `POST /v1/search` accepts.
 *
 * The form collects the text as `query`; the REST API calls it `q`.
 */
export interface LegalDataHunterSearchArgs {
  q: string
  namespace?: string
  top_k?: number
  alpha?: number
  country?: string[]
  source?: string[]
  court?: string
  court_tier?: number
  jurisdiction?: string
  language?: string
  date_start?: string
  date_end?: string
  /** How much each hit carries: `snippet` (default), `summary_only`, `full_text`, `full_metadata`. */
  result_detail?: string
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
 * Turns a collected form request into the `POST /v1/search` body. Absent
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
    q: asText(params.query ?? params.q) ?? '',
    namespace: asText(params.namespace),
    top_k: asNumber(params.top_k),
    alpha: asNumber(params.alpha),
    country: asList(params.country),
    source: asList(params.source),
    court: asText(params.court),
    court_tier: asNumber(params.court_tier ?? params.courtTier),
    jurisdiction: asText(params.jurisdiction),
    language: asText(params.language),
    date_start: asText(params.date_start),
    date_end: asText(params.date_end),
    result_detail: asText(params.result_detail),
  }

  return Object.fromEntries(
    Object.entries(args).filter(([, value]) => value !== undefined),
  ) as LegalDataHunterSearchArgs
}

/** The `POST /v1/resolve` body. */
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

/** Hit keys the shared shape already has a slot for. */
const HIT_CORE_KEYS = new Set([
  'id', 'source', 'source_id', 'score', 'title', 'snippet', 'text',
  'url', 'country', 'language', 'date',
])

function camelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  )
}

/** The non-empty fields of a hit beyond the core ones, camelCased. */
function hitMetadata(hit: Record<string, unknown>): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(hit)) {
    if (HIT_CORE_KEYS.has(key) || isEmptyValue(value)) continue
    metadata[camelCase(key)] = value
  }
  return metadata
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
    // Every other field the provider filled, camelCased. Which ones a source
    // fills varies, so nothing is picked here: the result view works out its
    // columns from what actually came back. See LEGAL_DATA_HUNTER_RESULT_FIELDS.
    metadata: hitMetadata(hit),
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
          // The live API sends `data_types` (a list); older docs show `data_type`.
          dataType: entry.data_types ?? entry.data_type,
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
      // The API lists sources per country; with none chosen there is nothing to ask.
      if (!request.country) return []
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

// ---------------------------------------------------------------------------
// The REST mapping, for the host's server
// ---------------------------------------------------------------------------

/** Where the Legal Data Hunter REST API is served. Paths below start at `/v1`. */
export const LEGAL_DATA_HUNTER_BASE_URL = 'https://legaldatahunter.com'

/** One REST call, ready for the host's server to send. */
export interface LegalDataHunterRestRequest {
  method: 'GET' | 'POST'
  /** The path from the base URL, query string included. */
  path: string
  /** The JSON body, for `POST`. */
  body?: Record<string, unknown>
}

/** `FR/Judilibre` as a path: each segment encoded, the slash kept. */
function sourcePath(source: unknown): string {
  const text = asText(source)
  if (!text) throw new Error('Legal Data Hunter needs a source here.')
  return text.split('/').map(encodeURIComponent).join('/')
}

function withQuery(path: string, query: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    const text = asText(value)
    if (text !== undefined) params.set(key, text)
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

/**
 * Turns one adapter operation and its payload into the REST call that performs
 * it. Pure: the host's server adds the base URL and
 * `Authorization: Bearer <LDH_KEY>`, sends it, and returns the JSON response.
 *
 * ```ts
 * const { method, path, body } = toLegalDataHunterRestRequest(operation, payload)
 * const response = await fetch(LEGAL_DATA_HUNTER_BASE_URL + path, {
 *   method,
 *   headers: { Authorization: `Bearer ${process.env.LDH_KEY}`, 'Content-Type': 'application/json' },
 *   body: body && JSON.stringify(body),
 * })
 * ```
 */
export function toLegalDataHunterRestRequest(
  operation: LegalDataHunterOperation,
  payload: Record<string, unknown>,
): LegalDataHunterRestRequest {
  switch (operation) {
    case 'search':
      return { method: 'POST', path: '/v1/search', body: payload.args as Record<string, unknown> }

    case 'resolve':
      return { method: 'POST', path: '/v1/resolve', body: payload.args as Record<string, unknown> }

    case 'document': {
      // `source_id` may itself contain slashes, so it goes in the query string.
      const sourceId = asText(payload.source_id)
      if (!sourceId) throw new Error('Legal Data Hunter needs a source_id to fetch a document.')
      return {
        method: 'GET',
        path: withQuery(`/v1/documents/${sourcePath(payload.source)}`, { source_id: sourceId }),
      }
    }

    case 'countries':
      return { method: 'GET', path: '/v1/discover/countries' }

    case 'sources': {
      const country = asText(payload.country)
      if (!country) throw new Error('Legal Data Hunter lists sources per country; pass one.')
      return { method: 'GET', path: `/v1/discover/countries/${encodeURIComponent(country)}/sources` }
    }

    case 'filters':
      return {
        method: 'GET',
        path: withQuery(`/v1/discover/sources/${sourcePath(payload.source)}/filters`, {
          namespace: payload.namespace,
        }),
      }

    case 'report-issue': {
      const args = (payload.args ?? {}) as Record<string, unknown>
      const { source, ...body } = args
      return { method: 'POST', path: `/v1/sources/${sourcePath(source)}/issues`, body }
    }
  }
}
