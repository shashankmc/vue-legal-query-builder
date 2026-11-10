// Dataset-agnostic seam: resolution and payload shaping.
//
// Pure functions only, so no Vue mounting and no test framework beyond Node's
// built-in runner. Run: npm test

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'src', 'components')

// The functions live in a .ts file with a type-only import of ./types; compile
// them with the TypeScript the repo already depends on, then evaluate.
function loadDatasetsModule() {
  const source = readFileSync(join(srcDir, 'datasets.ts'), 'utf8')
  const builtIn = [
    { id: 'RS', label: 'Rechtspraak' },
    { id: 'ECHR', label: 'ECHR' },
    { id: 'CJEU', label: 'CJEU', disabled: true },
  ]
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  // ./types is type-only here; stub it with the built-in list for the run.
  const withStub = compiled.replace(/from ['"]\.\/types['"]/g, 'from "data:text/javascript,export const BUILT_IN_DATASETS=globalThis.__BUILT_IN__"')
  globalThis.__BUILT_IN__ = builtIn
  const url = 'data:text/javascript;base64,' + Buffer.from(withStub).toString('base64')
  return import(url)
}

const { resolveDatasets, defaultDataset, isBuiltInDataset } = await loadDatasetsModule()

test('no host datasets -> built-ins', () => {
  const ds = resolveDatasets(undefined)
  assert.deepEqual(ds.map((d) => d.id), ['RS', 'ECHR', 'CJEU'])
  assert.equal(ds.find((d) => d.id === 'CJEU').disabled, true)
})

test('host datasets replace the built-ins', () => {
  const ds = resolveDatasets([{ id: 'bluelab', label: 'BlueLab provisions' }])
  assert.deepEqual(ds.map((d) => d.id), ['bluelab'])
})

test('first enabled dataset is selected, skipped disabled ones', () => {
  assert.equal(defaultDataset(resolveDatasets(undefined)), 'RS')
  assert.equal(
    defaultDataset([{ id: 'X', label: 'X', disabled: true }, { id: 'bluelab', label: 'BlueLab' }]),
    'bluelab',
  )
})

test('all disabled falls back to RS', () => {
  assert.equal(defaultDataset([{ id: 'X', label: 'X', disabled: true }]), 'RS')
})

test('built-in detection', () => {
  assert.equal(isBuiltInDataset('RS'), true)
  assert.equal(isBuiltInDataset('ECHR'), true)
  assert.equal(isBuiltInDataset('bluelab'), false)
})

test('BUILT_IN_DATASETS stay in the built-in set', () => {
  for (const ds of resolveDatasets(undefined)) {
    assert.equal(isBuiltInDataset(ds.id) || ds.id === 'CJEU', true, `${ds.id} should be built in`)
  }
})

// Declarative field schema: pure collection + validation.
function loadDatasetFieldsModule() {
  const source = readFileSync(join(srcDir, 'datasetFields.ts'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
  return import(url)
}

const { collectDatasetParams, validateDatasetFields, isFieldFilled, hasDeclaredFields } =
  await loadDatasetFieldsModule()

const provisions = {
  id: 'provisions',
  label: 'Provisions',
  kind: 'provisions',
  fields: [
    { key: 'facts', block: 'FactsInput', label: 'Facts', required: true },
    { key: 'keywords', block: 'KeywordsInput', label: 'Keywords' },
    { key: 'internal', block: 'TextInput', label: 'Internal', includeInParams: false },
  ],
}

test('collectDatasetParams keeps only declared, filled fields', () => {
  const params = collectDatasetParams(provisions, {
    facts: 'A dismissal',
    keywords: [],
    internal: 'hidden',
    unrelated: 'ignored',
  })
  assert.deepEqual(params, { facts: 'A dismissal' })
})

test('collectDatasetParams omits includeInParams:false fields', () => {
  const params = collectDatasetParams(provisions, { facts: 'x', internal: 'y' })
  assert.equal('internal' in params, false)
})

test('validateDatasetFields checks required fields', () => {
  assert.equal(validateDatasetFields(provisions, { facts: 'x' }), true)
  assert.equal(validateDatasetFields(provisions, { facts: '' }), false)
  assert.equal(validateDatasetFields(provisions, {}), false)
})

test('isFieldFilled treats empties as unfilled', () => {
  assert.equal(isFieldFilled(''), false)
  assert.equal(isFieldFilled('  '), false)
  assert.equal(isFieldFilled([]), false)
  assert.equal(isFieldFilled(null), false)
  assert.equal(isFieldFilled(0), true)
  assert.equal(isFieldFilled(false), false)
  assert.equal(isFieldFilled(['a']), true)
  assert.equal(isFieldFilled({ a: 'x' }), true)
})

test('hasDeclaredFields is false without fields', () => {
  assert.equal(hasDeclaredFields(undefined), false)
  assert.equal(hasDeclaredFields({ id: 'x', label: 'X' }), false)
  assert.equal(hasDeclaredFields(provisions), true)
})
