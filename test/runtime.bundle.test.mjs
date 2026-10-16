// The provider-agnostic runtime, exercised through the built bundle.
//
// This is the contract test the plan calls for: a fake host adapter implements
// the LDH operations, the runtime resolves a manifest, and a search runs
// end-to-end. It skips when the bundle has not been built, so `npm test` works
// on a clean checkout; run `npm run build` first for the full check.

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const bundlePath = join(here, '..', 'dist', 'vue-legal-query-builder.es.js')
const built = existsSync(bundlePath)
const skip = built ? false : 'run `npm run build` first'

const manifest = {
  schemaVersion: '3',
  defaultProvider: 'ldh',
  defaultDatabase: 'case-law',
  providers: [
    {
      id: 'ldh',
      label: 'Legal Data Hunter',
      type: 'legal-data-hunter',
      defaultDatabase: 'case-law',
      capabilities: {
        operations: ['search', 'discoverCountries', 'discoverSources', 'getFilters'],
        supportsDiscovery: true,
      },
    },
    { id: 'other', label: 'Other', type: 'x' },
  ],
  databases: [
    {
      id: 'case-law',
      label: 'Case law',
      provider: 'ldh',
      kind: 'case-law',
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true },
        {
          key: 'country',
          control: 'multiselect',
          label: 'Countries',
          userConfigurable: true,
        },
        {
          key: 'court',
          control: 'text',
          label: 'Court',
          dependencies: [{ key: 'country', operator: 'truthy' }],
        },
      ],
    },
    { id: 'legislation', label: 'Legislation', provider: 'ldh' },
  ],
  resultViews: [{ kind: 'ranked-list' }],
}

function makeAdapter(overrides = {}) {
  return {
    async search(request) {
      return {
        provider: request.provider,
        database: request.database,
        query: String(request.params.query ?? ''),
        totalHits: 1,
        hits: [
          {
            id: '1',
            provider: request.provider,
            database: request.database,
            source: 'FR/Judilibre',
            sourceId: 'JURITEXT000000001',
            title: 'Cour de cassation',
            metadata: { court: 'Cour de cassation' },
          },
        ],
      }
    },
    async discoverCountries() {
      return [{ value: 'FR', label: 'France', count: 1850000 }]
    },
    async discoverSources() {
      return [{ value: 'FR/Judilibre', label: 'Judilibre' }]
    },
    async getFilters() {
      return { source: 'FR/Judilibre', courts: [{ value: 'Cour de cassation', label: 'Cour de cassation' }] }
    },
    ...overrides,
  }
}

test('the bundle exposes the runtime surface', { skip }, async () => {
  const mod = await import(bundlePath)
  for (const name of [
    'useLegalSearchRuntime',
    'useLegalSearchRuntimeContext',
    'provideLegalSearchRuntime',
    'normalizeAdapterError',
    'ProviderOperationError',
    'validateFields',
    'collectParams',
    'defaultProviderFor',
    'LegalDocsForm',
  ]) {
    assert.ok(name in mod, `expected the bundle to export ${name}`)
  }
})

test('resolves a manifest and routes a search through the adapter', { skip }, async () => {
  const { useLegalSearchRuntime } = await import(bundlePath)

  const runtime = useLegalSearchRuntime({ manifest, adapter: makeAdapter() })
  await runtime.load()

  assert.equal(runtime.ready.value, true)
  assert.equal(runtime.providerId.value, 'ldh')
  assert.equal(runtime.databaseId.value, 'case-law')

  // A required field blocks the search until it is filled.
  assert.equal(runtime.validate().valid, false)
  runtime.setValue('query', 'droit à l oubli')
  assert.equal(runtime.validate().valid, true)

  // A dependency-hidden field is not collected.
  runtime.setValue('court', 'Cour de cassation')
  assert.deepEqual(runtime.buildRequest().params, { query: 'droit à l oubli' })

  runtime.setValue('country', ['FR'])
  assert.deepEqual(runtime.buildRequest().params, {
    query: 'droit à l oubli',
    country: ['FR'],
    court: 'Cour de cassation',
  })

  const result = await runtime.search()
  assert.equal(result.hits.length, 1)
  assert.equal(result.hits[0].source, 'FR/Judilibre')
  // The same result is readable back from the (reactive) database state.
  assert.equal(runtime.activeState.value.result.hits[0].sourceId, 'JURITEXT000000001')
  assert.equal(runtime.activeState.value.loading, false)
})

test('switching provider reselects a database and keeps state apart', { skip }, async () => {
  const { useLegalSearchRuntime } = await import(bundlePath)
  const runtime = useLegalSearchRuntime({ manifest, adapter: makeAdapter() })
  await runtime.load()

  runtime.setValue('query', 'kept for case-law')
  runtime.setDatabase('legislation')
  assert.equal(runtime.databaseId.value, 'legislation')
  // The new database starts from its own (empty) values.
  assert.notEqual(runtime.activeState.value.values.query, 'kept for case-law')

  runtime.setDatabase('case-law')
  assert.equal(runtime.activeState.value.values.query, 'kept for case-law')

  runtime.setProvider('other')
  assert.equal(runtime.providerId.value, 'other')
  assert.equal(runtime.databaseId.value, undefined)
})

test('discovery runs through the adapter and survives a failure', { skip }, async () => {
  const { useLegalSearchRuntime } = await import(bundlePath)

  const runtime = useLegalSearchRuntime({ manifest, adapter: makeAdapter() })
  await runtime.load()

  await runtime.discoverCountries()
  assert.equal(runtime.discovery.countries.length, 1)

  await runtime.discoverSources('FR')
  assert.equal(runtime.discovery.sources[0].value, 'FR/Judilibre')

  await runtime.loadFilters('FR/Judilibre')
  assert.equal(runtime.discovery.filters.courts.length, 1)

  const failing = useLegalSearchRuntime({
    manifest,
    adapter: makeAdapter({
      async search() {
        throw new Error('boom')
      },
    }),
  })
  await failing.load()
  failing.setValue('query', 'x')
  await assert.rejects(() => failing.search(), (error) => {
    assert.equal(error.code, 'NETWORK_ERROR')
    return true
  })
  assert.equal(failing.activeState.value.error.code, 'NETWORK_ERROR')
})

test('a provider error passes through normalizeAdapterError untouched', { skip }, async () => {
  const { normalizeAdapterError, ProviderOperationError } = await import(bundlePath)

  const original = new ProviderOperationError('RATE_LIMITED', 'slow down', { retryAfterSeconds: 30 })
  assert.equal(normalizeAdapterError(original, 'search', 'ldh'), original)

  const wrapped = normalizeAdapterError(new Error('boom'), 'search', 'ldh')
  assert.equal(wrapped.code, 'NETWORK_ERROR')
  assert.equal(wrapped.operation, 'search')
  assert.equal(wrapped.provider, 'ldh')
})

test('an invalid manifest surfaces as configError without throwing', { skip }, async () => {
  const { useLegalSearchRuntime } = await import(bundlePath)

  const runtime = useLegalSearchRuntime({
    manifest: { schemaVersion: '3', providers: [] },
    adapter: makeAdapter(),
  })
  await runtime.load()

  assert.equal(runtime.ready.value, false)
  assert.ok(runtime.configError.value)
})
