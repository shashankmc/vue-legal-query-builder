<template>
  <main class="demo">
    <header class="demo-header">
      <h1>vue-legal-query-builder</h1>
      <p>Interactive demo &amp; validation harness — every feature, old and new.</p>
    </header>

    <!-- Two unrelated things live in this package: the query builder with its
         datasets and guided forms, and the provider runtime Legal Data Hunter
         plugs into. Each is its own entry, with only its own settings. -->
    <nav class="entries" aria-label="Demo entries">
      <a href="#builder" class="entry" :aria-current="entry === 'builder' ? 'page' : undefined">
        <strong>Query builder</strong>
        <small>Case Law Explorer datasets, guided forms, BlueLab fields</small>
      </a>
      <a href="#ldh" class="entry" :aria-current="entry === 'ldh' ? 'page' : undefined">
        <strong>Legal Data Hunter</strong>
        <small>Provider runtime: discovery, search, result fields, documents</small>
      </a>
    </nav>

    <section class="panel">
      <h2>1. Configure the form</h2>
      <div v-if="entry === 'builder'" class="controls">
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

        <label class="check">
          <input type="checkbox" v-model="customResultView" />
          Register a custom result view
        </label>

        <label>
          Title
          <input v-model="title" type="text" />
        </label>
      </div>

      <div v-else class="controls">
        <label>
          Data
          <select v-model="ldhSource">
            <option value="stub">Sample data (no API calls)</option>
            <option value="live">Live API (uses your LDH key)</option>
          </select>
          <small v-if="ldhSource === 'live'" class="hint">{{ liveStatusText }}</small>
        </label>

        <label class="check">
          <input type="checkbox" v-model="customResultView" />
          Register a custom result view
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
        :manifest="manifest"
        :adapter="adapter"
        :result-views="resultViews"
        :on-search-laws="withLawSearch ? searchLaws : undefined"
        :on-submit="withOnSubmit ? handleOnSubmit : undefined"
        @submit="onSubmit"
        @success="onSuccess"
        @error="onError"
        @provider-change="(id) => log('submit', { provider: id })"
        @database-change="(id) => log('submit', { database: id })"
        @operation-start="(op) => log('submit', { operationStart: op })"
        @operation-error="(op, error) => log('error', { operationError: op, message: error?.message })"
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
      <table v-if="entry === 'builder'" class="matrix">
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
          <tr><td>Pluggable result view (host registry)</td><td>Register a custom result view</td><td class="new">new seam</td></tr>
        </tbody>
      </table>
      <table v-else class="matrix">
        <thead>
          <tr><th>Feature</th><th>Where</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Provider runtime (manifest + adapter)</td><td>Provider and corpus pickers</td><td class="new">new</td></tr>
          <tr><td>Discovery (country → source → filters)</td><td>Country, then Sources</td><td class="new">new</td></tr>
          <tr><td>Result fields follow the sources</td><td>Fields picker above results</td><td class="new">new</td></tr>
          <tr><td>List / table layout, remembered</td><td>List · Table switch</td><td class="new">new</td></tr>
          <tr><td>Document retrieval, citation resolve</td><td>View document · Resolve</td><td class="new">new</td></tr>
          <tr><td>Live REST API, key kept server-side</td><td>Data = Live API</td><td class="new">new</td></tr>
          <tr><td>Pluggable result view (host registry)</td><td>Register a custom result view</td><td class="new">new</td></tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LegalDocsForm, FormType, BUILT_IN_DATASETS, type DatasetDescriptor, type GuidedStructure, type LegalDocsQuery } from '../src'
import { allBlocksStructure, bluelabStructure, realisticStructure } from './structures'
import { searchDocuments, searchLaws as stubSearchLaws, type SearchResponse } from './stubBackend'
import { liveAdapter, liveStatus, runtimeAdapter, runtimeManifest } from './runtimeProvider'
import CustomResultView from './CustomResultView.vue'

const mode = ref<'free' | 'guided'>('guided')
const structureKey = ref<'realistic' | 'allBlocks' | 'bluelab'>('realistic')
const datasetKey = ref<'builtin' | 'builtin-bluelab' | 'bluelab-only'>('builtin')
// Which demo entry is open, from the URL hash so a link can open either one.
type Entry = 'builder' | 'ldh'
const entryFromHash = (): Entry => (location.hash === '#ldh' ? 'ldh' : 'builder')
const entry = ref<Entry>(entryFromHash())
window.addEventListener('hashchange', () => (entry.value = entryFromHash()))

const ldhSource = ref<'stub' | 'live'>('stub')
const runtimeKey = computed<'off' | 'ldh' | 'ldh-live'>(() =>
  entry.value !== 'ldh' ? 'off' : ldhSource.value === 'live' ? 'ldh-live' : 'ldh',
)
const liveStatusText = ref('Checking the dev server…')
watch(runtimeKey, async (key) => {
  if (key !== 'ldh-live') return
  const status = await liveStatus()
  liveStatusText.value = !status
    ? 'No /api/ldh route — run the demo with `npm run demo`.'
    : status.keyConfigured
      ? 'Key configured on the dev server. Calls go to legaldatahunter.com.'
      : 'No LDH_KEY on the dev server: discovery works, search will fail with 401.'
})
const customResultView = ref(false)
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

const manifest = computed(() => (runtimeKey.value === 'off' ? undefined : runtimeManifest))
const adapter = computed(() =>
  runtimeKey.value === 'ldh' ? runtimeAdapter : runtimeKey.value === 'ldh-live' ? liveAdapter : undefined,
)

// A host view for the kind the database declares, so the registry path is
// exercised rather than the built-in ranked list.
const resultViews = computed(() =>
  customResultView.value ? { 'ranked-list': CustomResultView } : undefined,
)

// Remount the form when the shape changes, so switching modes/structures is clean.
const formKey = computed(() => `${mode.value}:${structureKey.value}:${datasetKey.value}:${runtimeKey.value}:${title.value}`)

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
.entries {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.entry {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  text-decoration: none;
}
.entry small {
  color: var(--muted);
  font-size: 12px;
}
.entry[aria-current='page'] {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
  background: #eff6ff;
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
