// Result fields: which columns a result set can show, worked out from the hits.
//
// Pure functions only, compiled from source like the other test files.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))

function load(...path) {
  const text = readFileSync(join(here, '..', 'src', ...path), 'utf8')
  const compiled = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText
  return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
}

const {
  resultFieldsFromView,
  resultFieldValue,
  humanizeFieldKey,
  availableResultFields,
  defaultResultColumns,
  resolveResultColumns,
  resultColumnsStorageKey,
  formatResultValue,
} = await load('components', 'resultFields.ts')
const { toResultEntries } = await load('components', 'resultEntries.ts')
const { LEGAL_DATA_HUNTER_RESULT_FIELDS, normalizeLegalDataHunterSearch, legalDataHunterManifest } =
  await load('providers', 'legalDataHunter.ts')

// Shaped like live LDH answers: a court source and a legislation source fill
// different fields, and most of the rest come back null.
const caseLawHit = {
  source: 'FR/Judilibre', source_id: 'A', title: 'Cour de cassation, crim.', score: 0.5,
  url: 'https://example.org/a', country: 'FR', date: '2007-10-09',
  court: 'Cour de cassation', court_tier: 1, chamber: 'Chambre criminelle',
  ecli: null, case_number: null, eli_uri: null, status: null, quality_tier: 'gold',
}
const legislationHit = {
  source: 'FR/LegifranceCodes', source_id: 'B', title: 'Code civil - Article 9',
  date: '1970-07-19', document_type: 'article', status: 'VIGUEUR',
  effective_date: '1970-07-19', eli_uri: 'https://www.legifrance.gouv.fr/eli/x', court: null,
}

function entriesOf(...hits) {
  const result = normalizeLegalDataHunterSearch({ hits }, { provider: 'ldh', database: 'case-law' })
  return toResultEntries(result).entries
}

test('the LDH normalizer keeps every filled field and drops the nulls', () => {
  const [entry] = entriesOf(caseLawHit)
  assert.equal(entry.metadata.chamber, 'Chambre criminelle')
  assert.equal(entry.metadata.courtTier, 1)
  assert.equal(entry.metadata.qualityTier, 'gold')
  for (const key of ['ecli', 'caseNumber', 'eliUri', 'status']) {
    assert.equal(key in entry.metadata, false, `${key} is null and should be dropped`)
  }
})

test('a court source offers court fields, in catalogue order', () => {
  const available = availableResultFields(entriesOf(caseLawHit), LEGAL_DATA_HUNTER_RESULT_FIELDS)
  assert.deepEqual(
    available.map((field) => field.key),
    ['source', 'date', 'court', 'chamber', 'courtTier', 'country', 'qualityTier'],
  )
  // Defaults: the ones marked default that this source fills.
  assert.deepEqual(defaultResultColumns(available), ['source', 'date', 'court'])
})

test('a legislation source offers legislation fields instead', () => {
  const available = availableResultFields(entriesOf(legislationHit), LEGAL_DATA_HUNTER_RESULT_FIELDS)
  const keys = available.map((field) => field.key)
  assert.ok(keys.includes('eliUri'))
  assert.ok(keys.includes('effectiveDate'))
  assert.equal(keys.includes('court'), false)
  assert.deepEqual(defaultResultColumns(available), ['source', 'date', 'documentType', 'status', 'effectiveDate'])
})

test('a field the catalogue does not know is still offered, with a readable label', () => {
  const available = availableResultFields(
    entriesOf({ ...caseLawHit, judges_panel: 'Three judges' }),
    LEGAL_DATA_HUNTER_RESULT_FIELDS,
  )
  assert.deepEqual(available.at(-1), { key: 'judgesPanel', label: 'Judges panel' })
})

test('without a catalogue, present fields are offered and the first few shown', () => {
  const [entry] = toResultEntries({ hits: [{ title: 'T', court: 'C', date: 'd', metadata: { extra_note: 'n' } }] }).entries
  const available = availableResultFields([entry])
  assert.deepEqual(available.map((f) => f.key).sort(), ['court', 'date', 'extra_note'])
  assert.equal(defaultResultColumns(available).length, 3)
})

test('a saved choice wins, keeps its order, and drops fields these results lack', () => {
  const available = availableResultFields(entriesOf(caseLawHit), LEGAL_DATA_HUNTER_RESULT_FIELDS)
  assert.deepEqual(resolveResultColumns(available, ['chamber', 'ecli', 'source']), ['chamber', 'source'])
  assert.deepEqual(resolveResultColumns(available, []), [])
  assert.deepEqual(resolveResultColumns(available, null), ['source', 'date', 'court'])
})

test('values are read from metadata first, then the entry', () => {
  const [entry] = entriesOf(caseLawHit)
  assert.equal(resultFieldValue(entry, 'chamber'), 'Chambre criminelle')
  assert.equal(resultFieldValue(entry, 'date'), '2007-10-09')
  assert.equal(resultFieldValue(entry, 'nothing'), undefined)
})

test('values format by type', () => {
  assert.equal(formatResultValue('2007-10-09T00:00:00Z', 'date'), '2007-10-09')
  assert.equal(formatResultValue(1234567, 'number'), (1234567).toLocaleString())
  assert.equal(formatResultValue(['a', 'b'], 'text'), 'a, b')
  assert.equal(formatResultValue(null, 'text'), '')
  assert.equal(formatResultValue('x'.repeat(300), 'longtext').length, 241)
})

test('the storage key is per provider, corpus and source set, order-free', () => {
  assert.equal(
    resultColumnsStorageKey('ldh', 'case-law', ['FR/b', 'FR/a']),
    resultColumnsStorageKey('ldh', 'case-law', ['FR/a', 'FR/b']),
  )
  assert.equal(resultColumnsStorageKey('ldh', 'case-law', undefined), 'lqb-columns:ldh:case-law:all')
  assert.notEqual(
    resultColumnsStorageKey('ldh', 'case-law', ['FR/a']),
    resultColumnsStorageKey('ldh', 'legislation', ['FR/a']),
  )
})

test('humanizeFieldKey reads camel and snake case', () => {
  assert.equal(humanizeFieldKey('caseNumber'), 'Case number')
  assert.equal(humanizeFieldKey('eli_uri'), 'Eli uri')
})

test('every LDH corpus carries the field catalogue and offers result detail', () => {
  for (const database of legalDataHunterManifest.databases) {
    const fields = resultFieldsFromView(database.defaultResultView)
    assert.deepEqual(fields, LEGAL_DATA_HUNTER_RESULT_FIELDS, database.id)
    assert.ok(database.fields.some((field) => field.key === 'result_detail'), database.id)
  }
  assert.equal(resultFieldsFromView({ kind: 'ranked-list' }), undefined)
})
