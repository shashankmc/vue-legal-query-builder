// Result shaping: what a view renders, whatever the search returned.
//
// Pure functions only, compiled from source like the other test files.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', 'src', 'components', 'resultEntries.ts')

function loadResultEntries() {
  const text = readFileSync(source, 'utf8')
  const compiled = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
  return import(url)
}

const { toResultEntries, isNormalizedSearchResult, scorePercent, formatScore } =
  await loadResultEntries()

const normalized = {
  provider: 'ldh',
  database: 'case-law',
  query: 'x',
  totalHits: 42,
  elapsedMs: 287,
  partial: true,
  warnings: ['Full text was unavailable for some results.'],
  nextCursor: 'page-2',
  hits: [
    {
      id: 'FR/Judilibre/A',
      provider: 'ldh',
      database: 'case-law',
      source: 'FR/Judilibre',
      sourceId: 'A',
      title: 'Cour de cassation',
      snippet: '…le droit au déréférencement…',
      score: 0.94,
      url: 'https://example.org/A',
      date: '2022-05-12',
      country: 'FR',
      language: 'fr',
      metadata: { court: 'Cour de cassation', ecli: 'ECLI:FR:CCASS:2022:C100438', caseNumber: '21-12.532' },
    },
  ],
}

test('a normalized result flattens with its facts and notes', () => {
  const shaped = toResultEntries(normalized)

  assert.equal(shaped.entries.length, 1)
  assert.equal(shaped.total, 42)
  assert.equal(shaped.elapsedMs, 287)
  assert.equal(shaped.partial, true)
  assert.equal(shaped.nextCursor, 'page-2')
  assert.deepEqual(shaped.warnings, ['Full text was unavailable for some results.'])
  assert.equal(shaped.empty, false)

  const entry = shaped.entries[0]
  assert.equal(entry.position, 1)
  assert.equal(entry.title, 'Cour de cassation')
  assert.equal(entry.score, 0.94)
  assert.equal(entry.source, 'FR/Judilibre')
  assert.equal(entry.url, 'https://example.org/A')
  // Source-specific fields are lifted out of metadata.
  assert.equal(entry.court, 'Cour de cassation')
  assert.equal(entry.ecli, 'ECLI:FR:CCASS:2022:C100438')
  assert.equal(entry.caseNumber, '21-12.532')
})

test('a bare array of hits is read too', () => {
  const shaped = toResultEntries([{ title: 'One' }, { title: 'Two' }])
  assert.deepEqual(shaped.entries.map((entry) => entry.title), ['One', 'Two'])
  assert.equal(shaped.total, 2)
})

test('the older provisions shape still renders', () => {
  const shaped = toResultEntries({
    documents: [{ doc_id: 'p1', title: 'Article 7:669 BW', score: 0.71, top_provision: '7:669' }],
  })
  const entry = shaped.entries[0]
  assert.equal(entry.title, 'Article 7:669 BW')
  assert.equal(entry.topProvision, '7:669')
  assert.equal(entry.score, 0.71)
})

test('top-level provider fields are read when they are not in metadata', () => {
  const shaped = toResultEntries({ hits: [{ title: 'T', court: 'BGH', ecli: 'ECLI:DE:1', case_number: 'X' }] })
  assert.equal(shaped.entries[0].court, 'BGH')
  assert.equal(shaped.entries[0].ecli, 'ECLI:DE:1')
  assert.equal(shaped.entries[0].caseNumber, 'X')
})

test('an unrecognized or empty result is empty, not a crash', () => {
  for (const value of [null, undefined, 42, 'text', {}, { hits: [] }]) {
    const shaped = toResultEntries(value)
    assert.equal(shaped.empty, true, `${JSON.stringify(value)} should be empty`)
    assert.deepEqual(shaped.entries, [])
  }
})

test('a hit with no title still gets an identity', () => {
  const shaped = toResultEntries({ hits: [{ source: 'FR/Judilibre', source_id: 'A' }] })
  assert.equal(shaped.entries[0].id, 'FR/Judilibre/A')
  assert.equal(shaped.entries[0].title, 'A')
})

test('isNormalizedSearchResult recognizes the provider shape', () => {
  assert.equal(isNormalizedSearchResult(normalized), true)
  assert.equal(isNormalizedSearchResult({ hits: [] }), true)
  assert.equal(isNormalizedSearchResult({ documents: [] }), false)
  assert.equal(isNormalizedSearchResult(null), false)
})

test('score helpers stay in range and format consistently', () => {
  assert.equal(scorePercent(0.94), 94)
  assert.equal(scorePercent(-1), 0)
  assert.equal(scorePercent(4), 100)
  assert.equal(formatScore(0.9401), '0.940')
  assert.equal(formatScore(undefined), '-')
})
