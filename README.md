# vue-legal-query-builder

A Vue 3 component library for building legal document search queries. Provides two flexible form modes: **FreeForm** for simple searches and **GuidedForm** for guided, multi-step workflows.

## Installation

```bash
npm install vue-legal-query-builder
```

## Demo / validation

A self-contained demo app exercises every feature, old and new, with a stubbed
in-memory backend so it runs with no token and no network:

```bash
npm install
npm run demo        # dev server at http://localhost:5173
npm run build:demo  # static build to dist-demo/
```

The page lets you switch:

- **Mode** — free form and guided form;
- **Guided structure** — a realistic search, every block type, or a
  BlueLab-style structure with custom fields;
- **Datasets** — the built-ins, or a host-supplied list (the new seam);
- **onSearchLaws / onSubmit** — on or off, to see behaviour without them.

Every `@submit`, `@success` and `@error` is shown on the page and in the
console, so the host contract is visible while you click. See `demo/`.

## Quick Start

```vue
<template>
  <LegalDocsForm
    :on-search-laws="handleSearchLaws" 
    title="Search Legal Documents"
    type="free"
    @submit="handleSubmit"
    @success="handleSuccess"
    @error="handleError"
  />
</template>

<script setup>
import { LegalDocsForm } from 'vue-legal-query-builder'
import 'vue-legal-query-builder/style.css'

// This package never calls the API. Both of these go to your own server,
// which holds the credential. See "API access" below.
const handleSubmit = async (query) => {
  // `query` is a discriminated union: { dataset: 'RS', params } | { dataset: 'ECHR', params }
  const res = await fetch('/api/legal-docs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })
  return res.json()
}

const handleSearchLaws = async (text) => {
  const res = await fetch(`/api/legal-docs/laws?q=${encodeURIComponent(text)}`)
  return res.json()
}

const handleSuccess = (data) => {
  console.log('Search successful:', data)
}

const handleError = (error) => {
  console.error('Search error:', error)
}
</script>
```

## API access

**This package never calls the API.** It builds a query and hands it back to
you; you make the request from your own server.

That is not a limitation, it is the point. Calling the API needs a token, and a
token in a page is readable by anyone using it — and usable by them to make
whatever calls they like on your quota. No amount of hiding changes that, so
this package has no client, imports no HTTP library, and exports no way to
construct one.

```
browser ──▶ your server ──▶ Case Law Explorer API
             (holds the token)
```

On the server, use [`node-legal-docs-client`](../node-legal-docs-client) for
TypeScript or [`go-legal-docs-client`](../go-legal-docs-client) for Go. Tokens
are generated at
https://api.caselawexplorer.tech/login.html?next=/account.html

### The two callbacks

| Prop | Called when | You should |
|---|---|---|
| `onSubmit` | the user runs the search | POST the query to your server |
| `onSearchLaws` | the user types in the law selector | GET matching laws from your server |

`onSearchLaws` is optional. Without it the law selector tells the user that
search is unavailable, rather than spinning forever or silently finding
nothing.

```vue
<LegalDocsForm
  :on-submit="handleSubmit"
  :on-search-laws="handleSearchLaws"
/>
```

### Types

Request and response shapes come from
[`legal-docs-types`](../legal-docs-types) and are re-exported here. That
package has no client either, so it is safe to import anywhere.

## Datasets

The dataset selector supports **Rechtspraak** (Dutch case law) and **ECHR** (European Court of Human Rights); each produces its own query parameter shape (`RechtspraakQueryParameters` / `EchrQueryParameters`) reflected in the `dataset` discriminant of the submitted `LegalDocsQuery`. **CJEU** is shown as a disabled placeholder — `legal-docs-client` has no backing endpoint for it yet.

## Form Types

### FreeForm
A simple, flat form with all search options available at once. Users can fill in any combination of fields and search immediately.

**Best for:**
- Quick, flexible searches
- Expert users who know what they're looking for
- Minimal user guidance needed

**Example:**
```vue
<LegalDocsForm 
  type="free"
  title="Search Legal Documents"
  subtitle="Enter your search criteria below"
  @submit="handleSubmit"
/>
```

### GuidedForm
A structured, step-by-step workflow organized into "goals" and "steps". Users are guided through a multi-step process tailored to their search needs.

**Best for:**
- Guided workflows with specific search approaches
- Complex searches with multiple phases
- Users who benefit from structured guidance

The structure can be written by hand, as below, or taken from one of the
[built-in templates](#built-in-templates) — which is what guided mode falls back
to when no structure is passed.

**Example:**
```vue
<template>
  <LegalDocsForm 
    type="guided"
    title="Legal Case Search"
    subtitle="Choose your search approach"
    :guidedStructure="guidedStructure"
    @submit="handleSubmit"
  />
</template>

<script setup>
import { BlockType } from 'vue-legal-query-builder'

const guidedStructure = {
  goals: [
    {
      title: "Similarity Search",
      description: "Find cases comparable to your facts",
      icon: "layers",
      steps: [
        {
          title: "Facts",
          blocks: [
            {
              type: BlockType.KEYWORDS_INPUT,
              title: "Describe the facts",
              description: "Describe the factual situation in natural language",
              required: true,
              placeholder: "Example: An employee was dismissed after 10 years of service..."
            }
          ]
        },
        {
          title: "Laws",
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: "Legal provisions",
              description: "Adding legal provisions improves results",
              placeholder: "e.g., Art. 7:669 BW, Art. 7:671b BW"
            }
          ]
        },
        {
          title: "Period",
          blocks: [
            {
              type: BlockType.DATE_RANGE,
              title: "Date range",
              description: "The range determines which time period will be included"
            }
          ]
        }
      ]
    },
    {
      title: "Authority Search",
      description: "Find highly cited cases",
      icon: "scale",
      steps: [
        {
          title: "Legal Provisions",
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: "Legal provisions",
              required: true,
              placeholder: "e.g., Art. 6:162 BW"
            },
            {
              type: BlockType.KEYWORDS_INPUT,
              title: "Or keywords",
              required: true,
              placeholder: "e.g., onrechtmatige daad"
            }
          ]
        }
      ]
    }
  ]
}
</script>
```

## Built-in templates

Guided mode does not need a hand-written structure. The package ships a set of
guided structures, and guided mode falls back to the default one when neither
`guidedStructure` nor `guidedTemplate` is given:

```vue
<!-- renders the default template -->
<LegalDocsForm type="guided" @submit="handleSubmit" />

<!-- or name one explicitly -->
<LegalDocsForm type="guided" guidedTemplate="caselaw-search" @submit="handleSubmit" />
```

| Id | Name | Contents |
|----|------|----------|
| `caselaw-search` | Case law search | Similarity, authority and traditional keyword search over case law |

A host that wants to let its own users pick can list the templates:

```ts
import { guidedTemplates, DEFAULT_GUIDED_TEMPLATE_ID } from 'vue-legal-query-builder'

guidedTemplates.map((template) => ({
  id: template.id,          // 'caselaw-search'
  name: template.name,      // 'Case law search'
  description: template.description,
  goals: template.structure.goals.length,
}))
```

Also exported:

| Export | Description |
|--------|-------------|
| `guidedTemplates` | Every template the package ships, as `GuidedTemplate[]` |
| `DEFAULT_GUIDED_TEMPLATE_ID` | Id used when guided mode gets neither a structure nor a template |
| `getGuidedTemplate(id)` | One template by id, or `undefined` |
| `resolveGuidedStructure(structure?, templateId?)` | The structure the form would render: explicit structure, then template, then default |
| `caselawSearch` | The `caselaw-search` structure on its own, to start a variation from |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | 'free' \| 'guided' | 'free' | Form type (FreeForm or GuidedForm) |
| `title` | string | undefined | Form title (optional) |
| `subtitle` | string | undefined | Form subtitle (optional) |
| `datasets` | DatasetDescriptor[] | undefined | Datasets the picker offers. Omit for the built-ins (RS / ECHR / disabled CJEU) |
| `guidedStructure` | GuidedStructure | undefined | Structure to render in guided mode. Takes precedence over `guidedTemplate` |
| `guidedTemplate` | GuidedTemplateId | undefined | Id of a [built-in template](#built-in-templates), used when no `guidedStructure` is given |
| `onSubmit` | (query: LegalDocsQuery) => Promise<any> | undefined | Your server's search endpoint |
| `onSearchLaws` | (query: string) => Promise<BWBItem[]> | undefined | Your server's law-name lookup |
| `manifest` | QueryBuilderManifest | undefined | A provider/database manifest that switches the form onto the [runtime path](#provider-agnostic-runtime) |
| `loadManifest` | () => Promise<QueryBuilderManifest> | undefined | Fetch the manifest when none is passed |
| `adapter` | LegalSearchAdapter | undefined | The host's provider adapter; submitting routes the query through it |
| `initialProvider` | string | undefined | Provider selected on mount |
| `initialDatabase` | string | undefined | Database selected on mount |
| `fieldComponents` | Record<string, Component> | undefined | Custom field components, keyed by `FieldDescriptor.block` |
| `resultViews` | Record<string, Component> | undefined | Custom result views, keyed by `ResultViewRef.kind` |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@submit` | LegalDocsQuery | Emitted when form is submitted and data is valid. `LegalDocsQuery` is `{ dataset: 'RS', params: RechtspraakQueryParameters } \| { dataset: 'ECHR', params: EchrQueryParameters }` |
| `@success` | any | Emitted when search completes successfully |
| `@error` | Error | Emitted when an error occurs |
| `@provider-change` | string \| undefined | Emitted when the active provider changes |
| `@database-change` | string \| undefined | Emitted when the active database changes |
| `@configuration-change` | ResolvedLegalSearchConfig | Emitted when a manifest resolves into the runtime config |
| `@operation-start` | (operation: string, detail?: unknown) | Emitted before an adapter operation runs |
| `@operation-success` | (operation: string, result: unknown) | Emitted when an adapter operation succeeds |
| `@operation-error` | (operation: string, error: Error) | Emitted when an adapter operation fails |

## Form-Specific Behaviors

### Validation
- **FreeForm**: At least one of Keywords, ECLIs, or Selected Laws must be provided
- **GuidedForm**: For each step, at least one required block must be filled (validation applies only to the current goal being submitted)

### Warning Display
- If validation fails on submit attempt, a yellow warning message appears prompting the user to fill in required fields
- Users can retry after filling in the necessary fields

## Available Block Types

- `KEYWORDS_INPUT` - Comma-separated keyword input
- `ECLIS_INPUT` - ECLI code input
- `SELECTED_LAWS` - Search and select laws with autocomplete
- `INSTANCES_SELECTOR` - Select court instances
- `DOMAINS_SELECTOR` - Select legal domains
- `DOC_TYPE_SELECTOR` - Select decision/opinion types
- `DATE_RANGE` - Start and end date selection
- `ARTICLE_FIELD` - Article number input with AND/OR toggle
- `NETWORK_DEGREES` - Network degree configuration
- `TEXT_INPUT` - Generic text input
- `TEXTAREA_INPUT` - Multi-line text input
- `IMPORTANCE_LEVEL_SELECTOR` - Case importance level selection
- `FACTS_INPUT` - Facts input for similarity search
- `REASONING_INPUT` - Reasoning input for similarity search

## GuidedForm Structure

### Goal Object Properties
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes | Goal title shown in the goal card |
| `description` | string | Yes | Goal description shown in the goal card |
| `icon` | string | No | Optional Lucide icon name (for example `scale`, `layers`) |
| `dataset` | `'RS' \| 'ECHR' \| 'CJEU'` | No | Dataset this goal queries. Applied when the goal is selected; a `DATASET_SELECTOR` block in its steps can still change it afterwards |
| `fixedParameters` | GoalFixedParameters | No | Hidden query parameters automatically merged into the submitted query when this goal is selected |
| `steps` | Step[] | Yes | Steps shown after selecting the goal |

### dataset
By default, every goal queries whichever dataset is currently selected (`'RS'` unless changed) — there's a single, form-wide dataset value, not one per goal. Set `dataset` on a goal to pin it to `'RS'` or `'ECHR'` without needing to show a `DATASET_SELECTOR` block in its steps.

```ts
{
  title: "ECHR Case Search",
  description: "Search European Court of Human Rights case law",
  dataset: "ECHR",
  steps: [
    // ...
  ],
}
```

### fixedParameters
Use `fixedParameters` when you want to enforce specific query values for a goal without exposing extra controls in the UI. `GoalFixedParameters` is the intersection of `RechtspraakQueryParameters` and `EchrQueryParameters`, so it works regardless of which dataset the goal ends up using.

- Applied only for the currently selected goal
- Merged into the final query params (`RechtspraakQueryParameters` or `EchrQueryParameters`, depending on the selected dataset) right before submit
- If a fixed key overlaps with user-entered data, the fixed value takes precedence

**Example:** force `degreesTarget: 1` for an authority-search goal.

```ts
const guidedStructure = {
  goals: [
    {
      title: "Authority Search",
      description: "Find highly cited cases",
      icon: "scale",
      fixedParameters: {
        degreesTarget: 1,
      },
      steps: [
        // ...
      ],
    },
  ],
}
```

### Step Object Properties
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes | Title displayed below the step number in the stepper |
| `blocks` | Block[] | Yes | Array of blocks to display in this step |

Each step in the GuidedForm stepper displays its title below the numbered indicator, providing users with a quick overview of what each step entails.

## Credentials

**This package never holds one.** There is no API-key prop, no key input, and
nothing reads `import.meta.env` — a bundler inlines `VITE_*` at build time, so a
key read that way would be compiled into the published bundle. The host's
`adapter` is the only thing that talks to a provider, and it points at your
server.

What this package does do is **declare** that a provider needs a credential, so
a host can render the field and an operator can be told what to set. A provider
method carries a `DependencyDescriptor` with `kind: 'credential'`:

```ts
{
  id: 'ldh',
  label: 'Legal Data Hunter',
  type: 'legal-data-hunter',
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
        },
      ],
    },
  ],
}
```

Three helpers turn that declaration into something an operator can act on —
`requiredDependencies`, `unmetDependencies` and `buildDependencyScaffold`, all
re-exported here:

```ts
import { buildDependencyScaffold } from 'vue-legal-query-builder'

// # Backend configuration required by retrieval methods.
// # Fill in the values and give them to your service.
//
// # Method: Hybrid semantic + keyword search (search)
// #   - Legal Data Hunter API key [credential]
// LDH_KEY=
```

### Where the key actually lives

In [legal-blocks](https://github.com/MaastrichtU-BISS/legal-blocks) the key is a
**secret config field on the module**, and the pipeline machinery keeps it out
of everything readable:

```text
  composer form                          the user types the key here, once
       |  export
       v
  splitSecrets(pipeline)
       |---> pipeline.json    the design — safe to read, copy, commit
       +---> credentials.json the one file in the zip that is not
                    |
                    v
       platform reads it at request time   and an env var wins over the file
                    |
                    v
                    the provider, and nowhere else
```

The value is only ever used by the **server-side service**, which exposes
*named operations* rather than a proxy path — a page that cannot read a
credential could otherwise still spend it on any endpoint of the provider's API.

For Legal Data Hunter specifically, the API key is the fit: its MCP endpoint
also accepts `Authorization: Bearer <key>`, and its REST API takes the same
bearer token, so either transport works behind the bridge. (LDH's own guidance
is REST for web apps and MCP for agents; the key path is identical.)

### Tailoring the generated form

When the manifest sets `features.allowFieldCustomization`, the form shows a
**Customize fields** panel. A user can:

- show or hide **optional** fields;
- reorder them — moving a field only ever moves it past other optional fields;
- reset the layout to the provider's default;
- fold away the fields marked `advanced` behind a toggle.

They **cannot** hide a required field, rename its key, weaken its validation,
inject markup or a component, or touch transport or credentials. A required
field is pinned by the provider contract, and the panel shows it as locked.

Layout is per database and lives in memory only — switching databases keeps each
one's answers and layout, and nothing is persisted. Hidden advanced fields still
contribute their values and defaults to the query, so a fold-away `alpha` still
reaches the provider.

### Host field components

`fieldComponents` registers your own components, keyed by
`FieldDescriptor.block` (or `control`). Each is resolved in order:

1. your component for `field.block`
2. your component for `field.control`
3. the built-in block named by `field.block`
4. the generic renderer for `field.control`
5. an honest "unsupported field" note

```vue
<LegalDocsForm
  :manifest="manifest"
  :adapter="adapter"
  :field-components="{ CitationInput }"
/>
```

A host component receives `field`, `modelValue`, `disabled` and `error`, and
emits `update:modelValue`.

### Validation

Schema-driven, and checked against the fields actually on screen — a user is
never blocked by a field they cannot see:

| Rule | Fields |
|---|---|
| `required` | any |
| `min` / `max` | `number`, `range`, and `date` (as ISO bounds) |
| `minLength` / `maxLength` | `text`, `textarea` |
| `minItems` / `maxItems` | `multiselect` and any `multiple` field |
| option membership | fields declaring `options` |
| `dependencies` | fields gated on a sibling's value |

A boolean field is answered by **either** boolean, so a required boolean can be
answered "no" — the case the older helper got wrong.

## Legal Data Hunter

Legal Data Hunter is the first provider we ship a description for. Three things
come with it, all pure:

```ts
import {
  legalDataHunterManifest,     // the manifest a form renders
  createLegalDataHunterAdapter // request/response mapping + your transport
} from 'vue-legal-query-builder'
```

`legalDataHunterManifest` declares the provider, its three corpora (case law,
legislation, doctrine), each corpus's fields, and the credential requirement.
Point `manifest` at it and the form renders itself.

`createLegalDataHunterAdapter` maps the generic shapes onto the provider's and
back, and takes **your** transport — it has no HTTP client and no key:

```ts
const adapter = createLegalDataHunterAdapter({
  // The host's server-side bridge. This is where the LDH key lives.
  async call(operation, payload) {
    const response = await fetch(`/api/ldh/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },
})
```

### What the mapping does

- **Request**: `courtTier` becomes `court_tier` and is sent as a number; the
  `namespace` comes from the chosen database, not from the form; empty strings,
  empty lists and absent values are dropped rather than sent blank.
- **Protocol**: the arguments are emitted in **MCP** shape (`query`,
  `top_k`, …). The REST endpoint is the same set with `q` where this has
  `query` — that single rename belongs to the bridge, not to the form. REST
  also honours `court`, which the MCP `search` tool does not take.
- **Response**: hits become `NormalizedSearchHit`, with the provider's
  source-specific fields (`court`, `courtTier`, `ecli`, `caseNumber`, …) kept in
  `metadata` and the untouched payload in `raw`. Missing full text is reported
  as a warning rather than a failure.
- **Discovery**: `discoverCountries`, `discoverSources` and `getFilters`
  normalize the provider's snake_case answers (`decision_types`, `court_tiers`)
  onto `ProviderFilterSet`, which then seeds the form's option lists.
- **Errors**: whatever `call` throws propagates, and the runtime wraps it into a
  `ProviderOperationError` with a stable code.

The demo wires exactly this to an in-memory `call` in
[`demo/runtimeProvider.ts`](demo/runtimeProvider.ts) — swap `call` for the
`fetch` above and it is talking to a real bridge.

### Result views

A result is rendered by the first of these that exists:

1. a **host view** from `resultViews`, looked up by the kind the database's
   `defaultResultView` names;
2. the **`#results` slot**;
3. the **built-in** view for that kind (`ranked-list`);
4. in development, a raw JSON dump; in production, a line saying no view is
   registered for that kind.

```vue
<LegalDocsForm
  :manifest="manifest"
  :adapter="adapter"
  :result-views="{ 'ranked-list': MyTableView }"
/>
```

A host view receives `result` (whatever the search returned), `resultView` and
`loading`, and emits `load-more`. It does not have to understand the payload
itself — `toResultEntries(result)` flattens a normalized provider result, a bare
array of hits, or the older provisions-style `{ documents: […] }` into the same
`ResultEntry[]`, and reports `total`, `warnings`, `partial`, `nextCursor` and
`empty` alongside it:

```ts
import { toResultEntries } from 'vue-legal-query-builder'

const shaped = toResultEntries(props.result)
shaped.entries[0].court   // lifted out of the hit's metadata
shaped.nextCursor         // present only when the provider paged
```

The built-in `ranked-list` shows the title (linked to the official source when
the provider gave a `url`), the snippet, score, and whatever of source, court,
jurisdiction, date, language, ECLI, case and country the hit carries. It reports
an empty set and any partial-result warning rather than looking broken, and
offers **Load more** only when the provider returned a cursor.

## Requirements

- Vue 3.4 or higher

## Provider-agnostic runtime

Passing a `manifest` (or a `loadManifest`) switches the form onto a
provider-agnostic path. The manifest describes providers and the databases they
expose, and each database generates its fields from a declarative schema, so a
host adds a corpus without forking the package. See
[`docs/runtime-configurable-legal-search-builder.md`](docs/runtime-configurable-legal-search-builder.md).

The form still never reaches a provider. It calls the `adapter` you mount —
normally a thin client for **your** server, which is where a provider credential
(e.g. Legal Data Hunter's OAuth token) lives and where an MCP bridge runs.

```vue
<template>
  <LegalDocsForm
    :manifest="manifest"
    :adapter="adapter"
    initial-provider="ldh"
    @provider-change="onProvider"
    @database-change="onDatabase"
    @operation-error="onOperationError"
  />
</template>

<script setup>
import { LegalDocsForm, useLegalSearchRuntime } from 'vue-legal-query-builder'

const manifest = { schemaVersion: '3', providers: [/* … */], databases: [/* … */] }

// A thin client for your own server. No credential ever reaches this file.
const adapter = {
  search: (request) =>
    fetch('/api/legal/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then((r) => r.json()),
  discoverCountries: (request) => fetch(`/api/legal/countries?...`).then((r) => r.json()),
  discoverSources: (request) => fetch(`/api/legal/sources?...`).then((r) => r.json()),
  getFilters: (request) => fetch(`/api/legal/sources/${request.source}/filters`).then((r) => r.json()),
}
</script>
```

### What your server must do

| Responsibility | Why |
|---|---|
| Authenticate with the provider | The credential stays server-side |
| Hold MCP OAuth/token state | The browser never sees a token |
| Invoke the provider's tools | MCP/HTTP calls happen off the page |
| Validate the request body | The page is untrusted input |
| Allowlist providers and tools | A compromised page cannot widen scope |
| Normalize provider responses to `NormalizedSearchResult` etc. | One shape for the UI |
| Map failures to `ProviderOperationError` codes | Stable errors, no transport details leaked |

### Driving the form in code

`useLegalSearchRuntime` is the composable the form uses internally; it is also
exported so a host (or a component inside the form's tree) can drive the runtime
directly — switching provider/database, reading the visible fields, validating,
or building the request:

```ts
import { useLegalSearchRuntime } from 'vue-legal-query-builder'

const runtime = useLegalSearchRuntime({ manifest, adapter })
await runtime.load()               // resolve the manifest
runtime.setDatabase('legislation') // switch corpus; state is kept per database
runtime.setValue('query', 'GDPR')
runtime.validate()                 // { valid, missing, errors }
runtime.buildRequest()             // { provider, database, params }
await runtime.search()             // calls adapter.search
```

Field layout, dependency gating, validation and param collection are pure
functions in the same module and are exported too (`resolveVisibleFields`,
`validateFields`, `collectParams`, `defaultFieldValues`, `moveField`, …).

### Discovery narrows the form

When a provider advertises `capabilities.supportsDiscovery`, the form adds
**country** and **source** pickers. Choosing a country clears the source and
reloads the source list; choosing a source loads its filters, which fill the
matching fields' options, so a `court` field offers only the courts that source
actually has.

The provider reports filters under plural names and the field names the singular
key, matched by a small published convention:

| Discovery answer | Field key |
|---|---|
| `countries` | `country` |
| `sources` | `source` |
| `courts` | `court` |
| `jurisdictions` | `jurisdiction` |
| `chambers` | `chamber` |
| `decisionTypes` | `decisionType` |
| `languages` | `language` |
| `courtTiers` | `courtTier` |
| `subdivisions` | `subdivision` |

The map is exported as `DISCOVERY_FIELD_KEYS`, and `mergeFieldOptions(fields,
{ filters, countries, sources })` applies it if you want to drive it yourself.
Choosing a country or a source also **pre-fills** the matching field, so what
will be sent is visible in the form rather than hidden in the picker. In-flight
discovery calls are guarded, so a slow reply cannot overwrite a newer selection.

## License

MIT

