// Legal Data Hunter: request mapping and response normalization.
//
// Pure functions only, compiled from source like the other test files. The
// module has no runtime imports, so nothing needs stubbing.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', 'src', 'providers', 'legalDataHunter.ts')

function loadLegalDataHunter() {
  const text = readFileSync(source, 'utf8')
  const compiled = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
  return import(url)
}

const {
  legalDataHunterManifest,
  namespaceForDatabase,
  toLegalDataHunterSearchArgs,
  toLegalDataHunterResolveArgs,
  toLegalDataHunterIssueArgs,
  normalizeLegalDataHunterHit,
  normalizeLegalDataHunterSearch,
  normalizeLegalDataHunterDocument,
  normalizeLegalDataHunterCountries,
  normalizeLegalDataHunterSources,
  normalizeLegalDataHunterFilters,
  normalizeLegalDataHunterResolvedReference,
  createLegalDataHunterAdapter,
} = await loadLegalDataHunter()

const context = { provider: 'ldh', database: 'case-law' }

test('the manifest describes the provider, its corpora and its credential', () => {
  assert.equal(legalDataHunterManifest.schemaVersion, '3')

  const provider = legalDataHunterManifest.providers[0]
  assert.equal(provider.id, 'ldh')
  assert.ok(provider.capabilities.operations.includes('discoverSources'))

  // The credential is declared, never carried.
  const dependency = provider.methods[0].dependencies[0]
  assert.equal(dependency.kind, 'credential')
  assert.deepEqual(dependency.configKeys, ['LDH_KEY'])
  assert.ok(!('value' in dependency))

  assert.deepEqual(
    legalDataHunterManifest.databases.map((database) => database.id),
    ['case-law', 'legislation', 'doctrine'],
  )
  for (const database of legalDataHunterManifest.databases) {
    assert.equal(database.provider, 'ldh')
    assert.ok(database.namespaces.length > 0)
  }
})

test('namespaceForDatabase maps a corpus onto its namespace', () => {
  assert.equal(namespaceForDatabase(legalDataHunterManifest, 'case-law'), 'case_law')
  assert.equal(namespaceForDatabase(legalDataHunterManifest, 'legislation'), 'legislation')
  assert.equal(namespaceForDatabase(legalDataHunterManifest, 'ghost'), undefined)
})

test('search args are MCP-shaped and omit what the user did not choose', () => {
  const args = toLegalDataHunterSearchArgs({
    provider: 'ldh',
    database: 'case-law',
    params: {
      query: 'right to be forgotten',
      top_k: 10,
      alpha: 0.7,
      country: ['FR', 'DE'],
      courtTier: '1',
      court: 'Cour de cassation',
      language: '',
      jurisdiction: undefined,
      source: [],
    },
  })

  assert.deepEqual(args, {
    query: 'right to be forgotten',
    top_k: 10,
    alpha: 0.7,
    country: ['FR', 'DE'],
    court: 'Cour de cassation',
    court_tier: 1,
  })

  // The empty list, the empty string and the undefined are all dropped.
  for (const key of ['source', 'language', 'jurisdiction', 'date_start']) {
    assert.equal(key in args, false, `${key} should be omitted`)
  }
})

test('search args prefer court_tier over courtTier and accept numbers as strings', () => {
  assert.equal(toLegalDataHunterSearchArgs({ provider: 'p', database: 'd', params: { query: 'x', courtTier: '2' } }).court_tier, 2)
  assert.equal(toLegalDataHunterSearchArgs({ provider: 'p', database: 'd', params: { query: 'x', court_tier: 3 } }).court_tier, 3)
})

test('resolve and issue args drop absent hints', () => {
  assert.deepEqual(toLegalDataHunterResolveArgs({ reference: 'art. 6 code civil' }), {
    reference: 'art. 6 code civil',
  })
  assert.deepEqual(
    toLegalDataHunterResolveArgs({ reference: 'x', hintCountry: 'FR' }),
    { reference: 'x', hint_country: 'FR' },
  )
  assert.deepEqual(toLegalDataHunterIssueArgs({ source: 'FR/Judilibre', issueType: 'invalid_url' }), {
    source: 'FR/Judilibre',
    issue_type: 'invalid_url',
  })
})

test('a hit normalizes with its source-specific fields kept in metadata', () => {
  const hit = normalizeLegalDataHunterHit(
    {
      source: 'FR/Judilibre',
      source_id: 'JURITEXT000046583921',
      score: 0.94,
      title: 'Cour de cassation, 1re civ.',
      snippet: '…le droit au déréférencement…',
      url: 'https://www.legifrance.gouv.fr/juri/id/JURITEXT000046583921',
      country: 'FR',
      language: 'fr',
      court: 'Cour de cassation',
      court_tier: 1,
      ecli: 'ECLI:FR:CCASS:2022:C100438',
      case_number: '21-12.532',
    },
    context,
  )

  assert.equal(hit.id, 'FR/Judilibre/JURITEXT000046583921')
  assert.equal(hit.title, 'Cour de cassation, 1re civ.')
  assert.equal(hit.score, 0.94)
  assert.equal(hit.metadata.courtTier, 1)
  assert.equal(hit.metadata.ecli, 'ECLI:FR:CCASS:2022:C100438')
  assert.equal(hit.metadata.caseNumber, '21-12.532')
  assert.ok(hit.raw)
})

test('a search response normalizes, warns on missing text and keeps raw', () => {
  const result = normalizeLegalDataHunterSearch(
    {
      query: 'right to be forgotten',
      total_hits: 2,
      elapsed_ms: 287,
      hits: [
        { source: 'FR/Judilibre', source_id: 'A', title: 'One' },
        { source: 'FR/Judilibre', source_id: 'B', title: 'Two', text_unavailable: true },
      ],
    },
    context,
  )

  assert.equal(result.provider, 'ldh')
  assert.equal(result.database, 'case-law')
  assert.equal(result.hits.length, 2)
  assert.equal(result.totalHits, 2)
  assert.equal(result.elapsedMs, 287)
  assert.equal(result.warnings.length, 1)
  assert.ok(result.raw)
})

test('an empty search response is an empty result, not a crash', () => {
  const result = normalizeLegalDataHunterSearch(null, context)
  assert.deepEqual(result.hits, [])
  assert.equal(result.totalHits, 0)
})

test('a document normalizes and flags unavailable text', () => {
  const document = normalizeLegalDataHunterDocument(
    { source: 'FR/Judilibre', source_id: 'A', title: 'Decision', court: 'Cour de cassation' },
    context,
  )
  assert.equal(document.textUnavailable, true)
  assert.equal(document.metadata.court, 'Cour de cassation')

  const withText = normalizeLegalDataHunterDocument(
    { source: 'FR/Judilibre', source_id: 'A', title: 'D', text: 'body', text_truncated: true, full_text_size: 900 },
    context,
  )
  assert.equal(withText.text, 'body')
  assert.equal(withText.textTruncated, true)
  assert.equal(withText.fullTextSize, 900)
})

test('countries normalize with their counts', () => {
  const countries = normalizeLegalDataHunterCountries({
    countries: [
      { code: 'FR', case_law_sources: 3, total_documents: 1850000 },
      { code: 'DE', total_documents: 920000 },
      { bad: true },
    ],
  })
  assert.deepEqual(countries.map((c) => c.value), ['FR', 'DE'])
  assert.equal(countries[0].count, 1850000)
  assert.match(countries[0].description, /1,850,000/)
})

test('sources normalize onto their court name', () => {
  const sources = normalizeLegalDataHunterSources({
    sources: [
      { source_id: 'FR/Judilibre', court_name: 'Cour de cassation', tier: 1, document_count: 520000, notes: 'x' },
      { source_id: 'FR/CNIL' },
    ],
  })
  assert.equal(sources[0].label, 'Cour de cassation')
  assert.equal(sources[0].count, 520000)
  assert.equal(sources[0].metadata.tier, 1)
  assert.equal(sources[1].label, 'FR/CNIL')
})

test('filters normalize snake_case keys onto the shared shape', () => {
  const filters = normalizeLegalDataHunterFilters(
    {
      courts: ['Cour de cassation'],
      languages: ['fr'],
      decision_types: ['arrêt'],
      court_tiers: [1, 2],
      date_range: { min: '1790-01-01', max: '2026-04-01' },
    },
    'FR/Judilibre',
  )

  assert.equal(filters.source, 'FR/Judilibre')
  assert.deepEqual(filters.courts, [{ value: 'Cour de cassation', label: 'Cour de cassation' }])
  assert.deepEqual(filters.decisionTypes, [{ value: 'arrêt', label: 'arrêt' }])
  assert.deepEqual(filters.courtTiers.map((tier) => tier.value), ['1', '2'])
  assert.equal(filters.dateRange.min, '1790-01-01')
})

test('a resolved reference reports its match type', () => {
  const one = normalizeLegalDataHunterResolvedReference(
    { match_type: 'exact', documents: [{ source: 'FR/Judilibre', source_id: 'A', title: 'T' }] },
    { ...context, reference: 'art. 6 code civil' },
  )
  assert.equal(one.matchType, 'exact')
  assert.equal(one.hits.length, 1)
  assert.equal(one.reference, 'art. 6 code civil')

  const none = normalizeLegalDataHunterResolvedReference({}, { ...context, reference: 'x' })
  assert.equal(none.matchType, 'fallback_search')
})

test('the adapter maps requests and normalizes responses through the host transport', async () => {
  const calls = []
  const adapter = createLegalDataHunterAdapter({
    async call(operation, payload) {
      calls.push({ operation, payload })
      if (operation === 'search') {
        return { query: 'x', total_hits: 1, hits: [{ source: 'FR/Judilibre', source_id: 'A', title: 'T' }] }
      }
      if (operation === 'countries') return { countries: [{ code: 'FR', total_documents: 10 }] }
      if (operation === 'sources') return { sources: [{ source_id: 'FR/Judilibre' }] }
      if (operation === 'filters') return { courts: ['Cour de cassation'] }
      if (operation === 'document') return { source: 'FR/Judilibre', source_id: 'A', title: 'D', text: 'b' }
      if (operation === 'resolve') return { match_type: 'exact', hits: [{ source: 'FR/Judilibre', source_id: 'A' }] }
      return {}
    },
  })

  const result = await adapter.search({
    provider: 'ldh',
    database: 'case-law',
    params: { query: 'x', top_k: 5 },
  })
  assert.equal(result.hits.length, 1)
  // The namespace came from the database, not from the form.
  assert.equal(calls[0].payload.args.namespace, 'case_law')
  assert.equal(calls[0].payload.args.top_k, 5)

  assert.equal((await adapter.discoverCountries({ provider: 'ldh', database: 'case-law' })).length, 1)
  assert.equal((await adapter.getFilters({ provider: 'ldh', database: 'case-law', source: 'FR/Judilibre' })).courts.length, 1)

  const resolved = await adapter.resolveReference({
    provider: 'ldh',
    database: 'case-law',
    reference: 'x',
  })
  assert.equal(resolved[0].matchType, 'exact')

  await adapter.reportSourceIssue({
    provider: 'ldh',
    database: 'case-law',
    source: 'FR/Judilibre',
    issueType: 'other',
  })
  assert.equal(calls.at(-1).operation, 'report-issue')
})
