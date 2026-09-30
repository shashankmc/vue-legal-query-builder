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
