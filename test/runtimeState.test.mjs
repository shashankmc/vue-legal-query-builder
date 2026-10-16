// Provider-agnostic runtime: field layout, dependencies, validation and the
// provider/database helpers. Pure functions only, so no Vue mounting and no
// test framework beyond Node's built-in runner. Run: npm test

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'src', 'components', 'runtime')

// runtimeState.ts has only a type-only import, which transpiles away, so the
// compiled module needs no stubbing to evaluate.
function loadRuntimeState() {
  const source = readFileSync(join(srcDir, 'runtimeState.ts'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
  return import(url)
}

const {
  EMPTY_FIELD_LAYOUT,
  resetFieldLayout,
  isFieldFilled,
  isUserConfigurable,
  defaultFieldValues,
  orderFields,
  applyLayout,
  dependencySatisfied,
  resolveVisibleFields,
  setFieldVisible,
  moveField,
  validateFields,
  filterAdvanced,
  collectParams,
  databasesForProvider,
  providerForDatabase,
  defaultDatabaseForProvider,
  defaultProviderFor,
  mergeFieldOptions,
  DISCOVERY_FIELD_KEYS,
} = await loadRuntimeState()

const field = (overrides) => ({ key: 'k', label: 'K', control: 'text', ...overrides })

test('isFieldFilled treats a boolean field as answered by either boolean', () => {
  assert.equal(isFieldFilled(false, 'boolean'), true)
  assert.equal(isFieldFilled(true, 'boolean'), true)
  assert.equal(isFieldFilled(undefined, 'boolean'), false)

  // Outside a boolean control, an empty value is still empty.
  assert.equal(isFieldFilled(''), false)
  assert.equal(isFieldFilled('  '), false)
  assert.equal(isFieldFilled([]), false)
  assert.equal(isFieldFilled(null), false)
  assert.equal(isFieldFilled(0), true)
  assert.equal(isFieldFilled(false), true)
  assert.equal(isFieldFilled(['a']), true)
})

test('isUserConfigurable excludes required fields', () => {
  assert.equal(isUserConfigurable(field({ userConfigurable: true })), true)
  assert.equal(isUserConfigurable(field({ userConfigurable: true, required: true })), false)
  assert.equal(isUserConfigurable(field({})), false)
})

test('defaultFieldValues seeds defaults and empty lists', () => {
  const values = defaultFieldValues([
    field({ key: 'q', control: 'text' }),
    field({ key: 'top_k', control: 'number', defaultValue: 10 }),
    field({ key: 'country', control: 'multiselect' }),
  ])
  assert.deepEqual(values, { top_k: 10, country: [] })
})

test('resetFieldLayout returns a fresh empty layout', () => {
  const layout = resetFieldLayout()
  assert.deepEqual(layout, { hidden: [], order: [] })
  assert.notEqual(layout, EMPTY_FIELD_LAYOUT)
})

test('orderFields reorders user-configurable fields but pins the rest', () => {
  const fields = [
    field({ key: 'a', userConfigurable: true }),
    field({ key: 'pinned', control: 'text' }),
    field({ key: 'b', userConfigurable: true }),
  ]
  const reordered = orderFields(fields, { hidden: [], order: ['b', 'a'] })
  assert.deepEqual(reordered.map((f) => f.key), ['b', 'pinned', 'a'])
})

test('applyLayout drops hidden fields and keeps schema order without an order', () => {
  const fields = [
    field({ key: 'a', userConfigurable: true }),
    field({ key: 'b', userConfigurable: true }),
  ]
  assert.deepEqual(applyLayout(fields, EMPTY_FIELD_LAYOUT).map((f) => f.key), ['a', 'b'])
  assert.deepEqual(
    applyLayout(fields, { hidden: ['a'], order: [] }).map((f) => f.key),
    ['b'],
  )
})

test('setFieldVisible refuses a required or unknown field', () => {
  const fields = [
    field({ key: 'a', userConfigurable: true }),
    field({ key: 'req', userConfigurable: true, required: true }),
  ]
  const hidden = setFieldVisible(fields, EMPTY_FIELD_LAYOUT, 'a', false)
  assert.deepEqual(hidden.hidden, ['a'])

  assert.deepEqual(setFieldVisible(fields, EMPTY_FIELD_LAYOUT, 'req', false).hidden, [])
  assert.deepEqual(setFieldVisible(fields, EMPTY_FIELD_LAYOUT, 'ghost', false).hidden, [])
})

test('moveField swaps neighbours and leaves the layout when it cannot move', () => {
  const fields = [
    field({ key: 'a', userConfigurable: true }),
    field({ key: 'b', userConfigurable: true }),
    field({ key: 'c', userConfigurable: true }),
  ]
  const moved = moveField(fields, EMPTY_FIELD_LAYOUT, 'a', 1)
  assert.deepEqual(moved.order, ['b', 'a', 'c'])

  // A move with nowhere to go is a no-op, so the layout is returned untouched.
  assert.deepEqual(moveField(fields, EMPTY_FIELD_LAYOUT, 'a', -1), EMPTY_FIELD_LAYOUT)
  assert.deepEqual(moveField(fields, EMPTY_FIELD_LAYOUT, 'c', 1), EMPTY_FIELD_LAYOUT)

  // From a materialized order, a boundary move still refuses to move.
  const ordered = { hidden: [], order: ['a', 'b', 'c'] }
  assert.deepEqual(moveField(fields, ordered, 'a', -1).order, ['a', 'b', 'c'])
})

test('dependencySatisfied evaluates the supported operators', () => {
  const truthy = field({ dependencies: [{ key: 'country', operator: 'truthy' }] })
  const empty = field({ dependencies: [{ key: 'court', operator: 'empty' }] })
  const equals = field({ dependencies: [{ key: 'namespace', operator: 'equals', value: 'legislation' }] })
  const includes = field({ dependencies: [{ key: 'country', operator: 'includes', value: 'FR' }] })
  const unknown = field({ dependencies: [{ key: 'x', operator: 'teleport' }] })

  assert.equal(dependencySatisfied(truthy, { country: ['FR'] }), true)
  assert.equal(dependencySatisfied(truthy, { country: [] }), false)
  assert.equal(dependencySatisfied(empty, {}), true)
  assert.equal(dependencySatisfied(empty, { court: 'X' }), false)
  assert.equal(dependencySatisfied(equals, { namespace: 'legislation' }), true)
  assert.equal(dependencySatisfied(equals, { namespace: 'case_law' }), false)
  assert.equal(dependencySatisfied(includes, { country: ['FR', 'DE'] }), true)
  assert.equal(dependencySatisfied(includes, { country: ['DE'] }), false)
  assert.equal(dependencySatisfied(unknown, {}), true)
})

test('resolveVisibleFields hides a field whose dependency is unmet', () => {
  const fields = [
    field({ key: 'country', control: 'multiselect' }),
    field({ key: 'court', control: 'text', dependencies: [{ key: 'country', operator: 'truthy' }] }),
  ]
  assert.deepEqual(resolveVisibleFields(fields, EMPTY_FIELD_LAYOUT, { country: [] }).map((f) => f.key), ['country'])
  assert.deepEqual(
    resolveVisibleFields(fields, EMPTY_FIELD_LAYOUT, { country: ['FR'] }).map((f) => f.key),
    ['country', 'court'],
  )
})

test('validateFields checks required values and accepts a required boolean answered no', () => {
  const fields = [
    field({ key: 'query', control: 'text', required: true }),
    field({ key: 'confirmed', control: 'boolean', required: true }),
  ]
  assert.equal(validateFields(fields, { query: 'x', confirmed: false }).valid, true)

  const result = validateFields(fields, { query: '' })
  assert.equal(result.valid, false)
  assert.deepEqual(result.missing, ['query', 'confirmed'])
})

test('validateFields enforces bounds and option membership', () => {
  const bounded = field({ key: 'top_k', control: 'number', min: 1, max: 100 })
  assert.equal(validateFields([bounded], { top_k: 0 }).errors.top_k, 'Must be at least 1.')
  assert.equal(validateFields([bounded], { top_k: 101 }).errors.top_k, 'Must be at most 100.')
  assert.equal(validateFields([bounded], { top_k: 10 }).valid, true)

  const select = field({
    key: 'namespace',
    control: 'select',
    options: [{ value: 'case_law', label: 'Case law' }],
  })
  assert.equal(validateFields([select], { namespace: 'nope' }).errors.namespace, 'Not an allowed value.')
  assert.equal(validateFields([select], { namespace: 'case_law' }).valid, true)
})

test('validateFields skips a dependency-hidden field', () => {
  const fields = [
    field({ key: 'country', control: 'multiselect' }),
    field({ key: 'court', control: 'text', required: true, dependencies: [{ key: 'country', operator: 'truthy' }] }),
  ]
  assert.equal(validateFields(fields, { country: [] }).valid, true)
  assert.equal(validateFields(fields, { country: ['FR'] }).valid, false)
})

test('validateFields enforces string length and multi-value cardinality', () => {
  const text = field({ key: 'query', control: 'text', minLength: 3, maxLength: 10 })
  assert.equal(validateFields([text], { query: 'ab' }).errors.query, 'Must be at least 3 characters.')
  assert.equal(validateFields([text], { query: 'x'.repeat(11) }).errors.query, 'Must be at most 10 characters.')
  assert.equal(validateFields([text], { query: 'abc' }).valid, true)

  const multi = field({ key: 'country', control: 'multiselect', minItems: 1, maxItems: 2 })
  assert.equal(validateFields([multi], { country: [] }).valid, true)
  assert.equal(validateFields([multi], { country: ['FR'] }).valid, true)
  assert.equal(validateFields([multi], { country: ['FR', 'DE', 'EU'] }).errors.country, 'Select at most 2.')
})

test('validateFields compares a date against its ISO bounds', () => {
  const date = field({ key: 'date_start', control: 'date', min: '2000-01-01', max: '2025-12-31' })
  assert.equal(validateFields([date], { date_start: '1999-12-31' }).errors.date_start, 'Must be on or after 2000-01-01.')
  assert.equal(validateFields([date], { date_start: '2026-01-01' }).errors.date_start, 'Must be on or before 2025-12-31.')
  assert.equal(validateFields([date], { date_start: '2020-06-01' }).valid, true)
})

test('filterAdvanced drops advanced fields unless asked', () => {
  const fields = [
    field({ key: 'query', control: 'text' }),
    field({ key: 'court', control: 'text', advanced: true }),
  ]
  assert.deepEqual(filterAdvanced(fields, false).map((f) => f.key), ['query'])
  assert.deepEqual(filterAdvanced(fields, true).map((f) => f.key), ['query', 'court'])
})

test('collectParams keeps declared, visible, filled fields only', () => {
  const fields = [
    field({ key: 'query', control: 'text' }),
    field({ key: 'country', control: 'multiselect', dependencies: [{ key: 'query', operator: 'truthy' }] }),
    field({ key: 'internal', control: 'text', includeInParams: false }),
  ]
  const params = collectParams(fields, { query: 'x', country: ['FR'], internal: 'hidden' })
  assert.deepEqual(params, { query: 'x', country: ['FR'] })
  assert.deepEqual(collectParams(fields, { internal: 'hidden' }), {})
})

const providers = [
  { id: 'ldh', label: 'LDH', type: 'legal-data-hunter', defaultDatabase: 'case-law' },
  { id: 'off', label: 'Off', type: 'x', disabled: true },
]
const databases = [
  { id: 'case-law', label: 'Case law', provider: 'ldh' },
  { id: 'legislation', label: 'Legislation', provider: 'ldh' },
  { id: 'other', label: 'Other', provider: 'off', disabled: true },
]

test('databasesForProvider filters by provider', () => {
  assert.deepEqual(databasesForProvider(databases, 'ldh').map((d) => d.id), ['case-law', 'legislation'])
  assert.deepEqual(databasesForProvider(databases, undefined), [])
})

test('providerForDatabase resolves the owning provider', () => {
  assert.equal(providerForDatabase(providers, databases, 'legislation')?.id, 'ldh')
  assert.equal(providerForDatabase(providers, databases, 'missing'), undefined)
})

test('defaultDatabaseForProvider honours the declared default then first enabled', () => {
  assert.equal(defaultDatabaseForProvider(providers, databases, 'ldh'), 'case-law')
  assert.equal(defaultDatabaseForProvider(providers, databases, 'off'), undefined)
  assert.equal(
    defaultDatabaseForProvider(
      [{ id: 'p', label: 'P', type: 'x', defaultDatabase: 'nope' }],
      [{ id: 'a', label: 'A', provider: 'p' }],
      'p',
    ),
    'a',
  )
})

test('defaultProviderFor prefers the first enabled provider', () => {
  assert.equal(defaultProviderFor(providers), 'ldh')
  assert.equal(defaultProviderFor([]), undefined)
})

test('mergeFieldOptions fills options from the discovered filters', () => {
  const fields = [
    field({ key: 'court', control: 'remote-select', label: 'Court' }),
    field({ key: 'query', control: 'text' }),
    field({
      key: 'language',
      control: 'select',
      options: [{ value: 'static', label: 'Static' }],
    }),
  ]

  const discovery = {
    filters: {
      source: 'FR/Judilibre',
      courts: [
        { value: 'Cour de cassation', label: 'Cour de cassation' },
        { value: 'Cour d appel', label: "Cour d'appel", count: 12 },
      ],
      languages: [{ value: 'fr', label: 'French' }],
    },
  }

  const merged = mergeFieldOptions(fields, discovery)
  assert.deepEqual(merged[0].options, [
    { value: 'Cour de cassation', label: 'Cour de cassation' },
    { value: 'Cour d appel', label: "Cour d'appel (12)" },
  ])
  // A field with no matching filter is untouched, and the control is preserved.
  assert.equal(merged[1].options, undefined)
  assert.equal(merged[1].control, 'text')
  // Discovered options win over static ones.
  assert.deepEqual(merged[2].options, [{ value: 'fr', label: 'French' }])
})

test('mergeFieldOptions fills country and source fields from discovery', () => {
  const fields = [
    field({ key: 'country', control: 'multiselect' }),
    field({ key: 'source', control: 'multiselect' }),
  ]

  const merged = mergeFieldOptions(fields, {
    countries: [{ value: 'FR', label: 'France', count: 1_850_000 }],
    sources: [{ value: 'FR/Judilibre', label: 'Judilibre' }],
  })

  assert.deepEqual(merged[0].options, [{ value: 'FR', label: 'France (1850000)' }])
  assert.deepEqual(merged[1].options, [{ value: 'FR/Judilibre', label: 'Judilibre' }])
})

test('mergeFieldOptions is a no-op without discovery', () => {
  const fields = [field({ key: 'court', control: 'remote-select' })]
  assert.equal(mergeFieldOptions(fields, undefined), fields)
  assert.equal(mergeFieldOptions(fields, { filters: { source: 'x' } }), fields)
})

test('DISCOVERY_FIELD_KEYS maps provider answers onto singular field keys', () => {
  assert.equal(DISCOVERY_FIELD_KEYS.courts, 'court')
  assert.equal(DISCOVERY_FIELD_KEYS.countries, 'country')
  assert.equal(DISCOVERY_FIELD_KEYS.sources, 'source')
  assert.equal(DISCOVERY_FIELD_KEYS.decisionTypes, 'decisionType')
  assert.equal(DISCOVERY_FIELD_KEYS.subdivisions, 'subdivision')
})
