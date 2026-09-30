<template>
  <main class="demo">
    <header class="demo-header">
      <h1>vue-legal-query-builder</h1>
      <p>Interactive demo &amp; validation harness — every feature, old and new.</p>
    </header>

    <section class="panel">
      <h2>1. Configure the form</h2>
      <div class="controls">
        <label>
          Mode
          <select v-model="mode">
            <option value="free">Free form (established)</option>
            <option value="guided">Guided form (established)</option>
          </select>
        </label>

        <label>
          Guided structure
          <select v-model="structureKey">
            <option value="realistic">Realistic search</option>
            <option value="allBlocks">Every block type</option>
            <option value="bluelab">BlueLab-style (custom fields)</option>
          </select>
        </label>

        <label>
          Datasets
          <select v-model="datasetKey">
            <option value="builtin">Built-ins (RS / ECHR / CJEU)</option>
            <option value="builtin-bluelab">Built-ins + BlueLab (new seam)</option>
            <option value="bluelab-only">BlueLab only (new seam)</option>
          </select>
        </label>

        <label class="check">
          <input type="checkbox" v-model="withLawSearch" />
          Provide <code>onSearchLaws</code>
        </label>

        <label class="check">
          <input type="checkbox" v-model="withOnSubmit" />
          Provide <code>onSubmit</code>
        </label>

        <label>
          Title
          <input v-model="title" type="text" />
        </label>
      </div>
    </section>

    <section class="panel">
      <h2>2. Use the form</h2>
      <LegalDocsForm
        :key="formKey"
        :type="mode === 'guided' ? FormType.GUIDED : FormType.FREE"
        :title="title"
        :subtitle="subtitle"
        :guided-structure="structure"
        :datasets="datasets"
        :on-search-laws="withLawSearch ? searchLaws : undefined"
        :on-submit="withOnSubmit ? handleOnSubmit : undefined"
        @submit="onSubmit"
        @success="onSuccess"
        @error="onError"
      />
    </section>

    <section class="panel">
      <h2>3. What the host received</h2>
      <p class="hint">
        Every event is listed here and in the browser console. This is the whole
        contract: the package builds a query and hands it back, it never calls an
        API itself.
      </p>
      <button class="clear" @click="events = []">Clear</button>
      <ol class="events">
        <li v-for="(e, i) in events" :key="i" :class="e.kind">
          <span class="badge">{{ e.kind }}</span>
          <time>{{ e.at }}</time>
          <pre>{{ e.payload }}</pre>
        </li>
        <li v-if="events.length === 0" class="empty">No events yet — submit the form.</li>
      </ol>
    </section>

    <section class="panel">
      <h2>What this validates</h2>
      <table class="matrix">
        <thead>
          <tr><th>Feature</th><th>Where</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Free form</td><td>Mode = Free form</td><td class="ok">established</td></tr>
          <tr><td>Guided form</td><td>Mode = Guided form</td><td class="ok">established</td></tr>
          <tr><td>All 15 block types</td><td>Structure = Every block type</td><td class="ok">established</td></tr>
          <tr><td><code>onSearchLaws</code> callback</td><td>Toggle + Selected laws block</td><td class="ok">established</td></tr>
          <tr><td><code>@submit</code> / <code>@success</code> / <code>@error</code></td><td>Event log</td><td class="ok">established</td></tr>
          <tr><td>Built-in datasets (RS/ECHR disabled CJEU)</td><td>Datasets = Built-ins</td><td class="ok">established</td></tr>
          <tr><td>Host-supplied dataset (generic payload)</td><td>Datasets = BlueLab…</td><td class="new">new seam</td></tr>
          <tr><td>Backward compatibility (no props ⇒ unchanged)</td><td>Datasets = Built-ins</td><td class="new">new seam</td></tr>
          <tr><td>Host-defined field set, no fork</td><td>Structure = BlueLab-style</td><td class="new">new seam</td></tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LegalDocsForm, FormType, BUILT_IN_DATASETS, type DatasetDescriptor, type GuidedStructure, type LegalDocsQuery } from '../src'
import { allBlocksStructure, bluelabStructure, realisticStructure } from './structures'
import { searchDocuments, searchLaws as stubSearchLaws, type SearchResponse } from './stubBackend'

const mode = ref<'free' | 'guided'>('guided')
const structureKey = ref<'realistic' | 'allBlocks' | 'bluelab'>('realistic')
const datasetKey = ref<'builtin' | 'builtin-bluelab' | 'bluelab-only'>('builtin')
const withLawSearch = ref(true)
const withOnSubmit = ref(true)
const title = ref('Search legal documents')
const subtitle = ref('A demo of every feature the package ships')

const structures: Record<string, GuidedStructure> = {
  realistic: realisticStructure,
  allBlocks: allBlocksStructure,
  bluelab: bluelabStructure,
}
const structure = computed(() => structures[structureKey.value])

const datasetsByKey: Record<string, DatasetDescriptor[] | undefined> = {
  builtin: undefined, // omit the prop entirely -> built-ins, unchanged behaviour
  'builtin-bluelab': [...BUILT_IN_DATASETS, { id: 'bluelab', label: 'BlueLab provisions' }],
  'bluelab-only': [{ id: 'bluelab', label: 'BlueLab provisions' }],
}
const datasets = computed(() => datasetsByKey[datasetKey.value])

// Remount the form when the shape changes, so switching modes/structures is clean.
const formKey = computed(() => `${mode.value}:${structureKey.value}:${datasetKey.value}:${title.value}`)

interface LoggedEvent {
  kind: 'submit' | 'success' | 'error'
  at: string
  payload: string
}
const events = ref<LoggedEvent[]>([])

function log(kind: LoggedEvent['kind'], payload: unknown) {
  const text = payload instanceof Error ? `${payload.name}: ${payload.message}` : JSON.stringify(payload, null, 2)
  events.value.unshift({ kind, at: new Date().toLocaleTimeString(), payload: text })
  // eslint-disable-next-line no-console
  console.log(`[demo] ${kind}`, payload)
}

const searchLaws = stubSearchLaws

function onSubmit(query: LegalDocsQuery) {
  log('submit', query)
}

async function handleOnSubmit(query: LegalDocsQuery): Promise<SearchResponse> {
  // A real host would POST to its own server here. The demo stubs it so the
  // @success path can be exercised without a token.
  return searchDocuments(query)
}

function onSuccess(data: unknown) {
  log('success', data)
}

function onError(error: Error) {
  log('error', error)
}
</script>

<style>
:root {
  --line: #d8e3eb;
  --ink: #1a1a2e;
  --muted: #5a6a7a;
  --accent: #3b82f6;
  --ok: #2e7d5b;
  --new: #b45309;
}
body {
  margin: 0;
  font-family: Inter, -apple-system, 'Segoe UI', sans-serif;
  color: var(--ink);
  background: #f4f8fb;
}
.demo {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
.demo-header h1 {
  margin: 0 0 4px;
}
.demo-header p {
  margin: 0 0 16px;
  color: var(--muted);
}
.panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 16px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.controls label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}
.controls select,
.controls input[type='text'] {
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
}
.controls label.check {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  align-self: flex-end;
  padding-bottom: 6px;
}
.hint {
  color: var(--muted);
  font-size: 13px;
}
.clear {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
.events {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}
.events li {
  border-left: 3px solid var(--accent);
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #f8fafc;
  border-radius: 4px;
}
.events li.success { border-left-color: var(--ok); }
.events li.error { border-left-color: #c0392b; }
.events time {
  font-size: 11px;
  color: var(--muted);
  margin-left: 8px;
}
.badge {
  display: inline-block;
  background: var(--accent);
  color: #fff;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
}
.events pre {
  margin: 6px 0 0;
  font-size: 12px;
  overflow: auto;
}
.events .empty {
  border-left-color: var(--line);
  color: var(--muted);
}
.matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.matrix th,
.matrix td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--line);
}
.matrix .ok { color: var(--ok); }
.matrix .new { color: var(--new); font-weight: 600; }
code {
  background: #eef2f7;
  padding: 1px 5px;
  border-radius: 4px;
}
</style>
