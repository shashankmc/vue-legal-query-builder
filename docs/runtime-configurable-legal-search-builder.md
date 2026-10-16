# Plan: Runtime-Configurable Legal Search Builder

## Confirmed direction

- End users select a provider/database at runtime.
- The form is generated automatically, then users may show, hide, and reorder optional fields.
- Required fields remain fixed.
- Build a provider-neutral core with Legal Data Hunter as the first adapter.
- Legal Data Hunter MCP runs behind a trusted host backend.
- Results use pluggable views.
- User configuration is not persisted initially.
- Deliver the full Legal Data Hunter tool suite incrementally.

## Target architecture

```text
Vue query builder
  ├─ provider/database selector
  ├─ runtime form configuration
  ├─ declarative field renderer
  ├─ normalized query/result contracts
  └─ injected host adapter
          │
          ▼
Host backend bridge
  ├─ authentication and OAuth
  ├─ MCP client
  ├─ error/rate-limit normalization
  └─ Legal Data Hunter MCP
       ├─ discover_countries
       ├─ discover_sources
       ├─ get_filters
       ├─ search
       ├─ get_document
       ├─ resolve_reference
       └─ report_source_issue
```

The component must continue to avoid direct credential handling or direct MCP connections.

## Current gaps

1. `Dataset` remains a closed `'RS' | 'ECHR' | 'CJEU'` union in parts of the public API.
2. `datasets` is host-provided and mostly static; users cannot discover databases dynamically.
3. The richer manifest/provider contracts in `legal-retrieval-types` are not consumed by this package.
4. `FieldBlock.vue` uses a fixed component mapping rather than an extensible registry.
5. `FieldDescriptor` lacks sufficient UI metadata for dynamic number, range, select, multiselect, conditional, and remote-option fields.
6. Custom values are held in one shared object rather than isolated per provider/database.
7. Results recognize only a narrow set of response shapes and one built-in view.
8. Loading and errors are global rather than operation-specific.
9. Tests cover pure dataset helpers but not mounted Vue behavior or provider flows.
10. Documentation and generated declarations do not fully reflect the current dataset seam.

## Phase 1: Provider-neutral contracts

Extend `legal-retrieval-types` rather than creating a competing schema inside this package.

### Provider model

Introduce or extend contracts for:

- `LegalSearchProviderDescriptor`
- `LegalDatabaseDescriptor`
- `ProviderCapabilities`
- `ProviderOperation`
- `ProviderAdapter`
- `ProviderOperationError`
- `NormalizedSearchResult`
- `NormalizedLegalDocument`
- `ResolvedLegalReference`
- `DiscoveryOption`

Keep these concepts distinct:

- **Provider:** Legal Data Hunter, Case Law Explorer, or a future provider.
- **Database/corpus:** case law, legislation, doctrine, or another provider-defined corpus.
- **Source:** for example `FR/Judilibre`.
- **Result view:** ranked list, table, graph, or host-defined view.

### Field schema improvements

Extend `FieldDescriptor` with optional properties such as:

```ts
type FieldControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'range'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'remote-select'

interface FieldDescriptor {
  key: string
  control?: FieldControl
  block?: string
  label: string
  description?: string
  required?: boolean
  defaultValue?: unknown
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  multiple?: boolean
  advanced?: boolean
  userConfigurable?: boolean
  dependencies?: FieldDependency[]
}
```

Retain `block` for backward compatibility. Standard provider fields should not require a dedicated Vue component.

### Manifest evolution

Create a new schema version rather than silently changing v2:

```ts
interface QueryBuilderManifestV3 {
  schemaVersion: '3'
  providers: LegalSearchProviderDescriptor[]
  databases: LegalDatabaseDescriptor[]
  defaultProvider?: string
  defaultDatabase?: string
  resultViews?: ResultViewRef[]
  features?: QueryBuilderFeatures
}
```

Update validation to detect:

- Duplicate provider, database, and field IDs.
- Missing provider references.
- Invalid default selections.
- Unsupported controls.
- Broken field dependencies.
- Invalid result-view references.
- Required fields marked as user-hideable.
- Unsupported provider operations.

### Compatibility

- Continue accepting manifest v1/v2.
- Convert older manifests into the resolved runtime model.
- Continue accepting the existing `datasets` prop.
- Preserve existing RS/ECHR payloads and callbacks.
- Make the public dataset ID type open to arbitrary strings.

## Phase 2: Runtime adapter boundary

Add one injected adapter contract instead of embedding HTTP or MCP behavior:

```ts
interface LegalSearchAdapter {
  loadManifest?(): Promise<QueryBuilderManifest>
  discoverCountries?(request): Promise<DiscoveryOption[]>
  discoverSources?(request): Promise<DiscoveryOption[]>
  getFilters?(request): Promise<ProviderFilterSet>
  search(request: ProviderSearchRequest): Promise<NormalizedSearchResult>
  getDocument?(request): Promise<NormalizedLegalDocument>
  resolveReference?(request): Promise<ResolvedLegalReference[]>
  reportSourceIssue?(request): Promise<void>
}
```

### Component API

Add props along these lines:

- `manifest`
- `loadManifest`
- `adapter`
- `initialProvider`
- `initialDatabase`
- `fieldComponents`
- `resultViews`

Add events:

- `provider-change`
- `database-change`
- `configuration-change`
- `operation-start`
- `operation-success`
- `operation-error`

Existing `submit`, `success`, and `error` events remain supported.

### Host backend responsibilities

The host backend must:

1. Authenticate the user with Legal Data Hunter.
2. Maintain MCP OAuth/token state.
3. Invoke MCP tools.
4. Validate incoming operation payloads.
5. Enforce allowed providers and tools.
6. Normalize MCP content responses into JSON.
7. Map rate limits and errors into stable error codes.
8. Never expose MCP credentials to the browser.

## Phase 3: Runtime provider and database selection

Replace the button-only dataset selector with a scalable selector supporting:

- Provider selection.
- Database/namespace selection.
- Country selection.
- Source selection.
- Disabled or unavailable providers.
- Loading and retry states.
- Large option sets with search.
- Provider/source descriptions and coverage counts.

Keep the existing compact buttons when only a few static datasets exist.

### State management

Create a composable such as `useLegalSearchRuntime` to own:

- Selected provider and database.
- Discovery state.
- Field schema and values.
- User field layout.
- Validation state.
- Search state.
- Results and selected document.
- Per-operation errors.

Store state separately per provider/database so switching does not mix parameters.

When a parent choice changes:

- Country changes invalidate incompatible sources.
- Source changes invalidate source-specific filters.
- Database/namespace changes refresh applicable discovery data.
- Provider changes clear incompatible state.

Use request IDs or `AbortController` so stale discovery responses cannot overwrite current selections.

## Phase 4: User-tailorable generated forms

Add a configuration panel where users can:

- Show or hide optional fields.
- Reorder visible optional fields.
- Reset to the provider default.
- Expand or collapse advanced filters.

Users cannot:

- Hide required fields.
- Change provider parameter keys.
- Weaken validation constraints.
- Inject arbitrary HTML or components.
- Modify backend transport or credentials.

Keep customization in memory for the initial release.

### Renderer changes

Refactor `DatasetFieldsForm.vue` and `FieldBlock.vue` into:

- Generic schema renderer for standard controls.
- Built-in legal block registry.
- Host component registry.
- Unsupported-field fallback with a clear warning.

Resolution order:

1. Host-supplied field component.
2. Built-in specialized legal block.
3. Generic control renderer.
4. Unsupported-control message.

### Validation

Move validation into schema-driven pure functions supporting:

- Required values.
- Numeric bounds.
- String length.
- Array cardinality.
- Date ordering.
- Conditional requirements.
- Option membership.
- Provider-specific validation hooks.

Correct the current behavior where `false` is always considered empty; a required boolean must accept either boolean value.

## Phase 5: Legal Data Hunter adapter

Create an LDH-specific manifest and backend mapping isolated from the generic UI.

### Search form

Map the LDH `search` tool into fields for:

- `query` — required.
- `namespace` — case law, legislation, or doctrine.
- `top_k` — 1–100.
- `alpha` — 0–1.
- `country` — discovered multiselect.
- `source` — discovered after country selection.
- `court_tier`.
- `jurisdiction`.
- `subdivision`.
- `language`.
- `date_start`.
- `date_end`.

Only expose optional parameters reported as supported by the configured LDH bridge/version. The adapter, not the Vue component, translates protocol differences such as MCP `query` versus REST `q`.

### Discovery flow

Implement:

1. `discover_countries`
2. `discover_sources(country)`
3. `get_filters(source)`
4. Merge returned source filters into the active form schema.
5. Cache discovery data for the current session.
6. Provide manual refresh.

Source filters may add options for courts, chambers, jurisdictions, decision types, languages, tiers, subdivisions, and valid date ranges.

### Search normalization

Normalize every LDH hit into:

```ts
interface NormalizedSearchHit {
  id: string
  provider: string
  database: string
  source: string
  sourceId: string
  title: string
  snippet?: string
  score?: number
  url?: string
  date?: string
  country?: string
  language?: string
  metadata: Record<string, unknown>
  raw?: unknown
}
```

Keep the raw response available for advanced host views without making the built-in UI depend on it.

## Phase 6: Pluggable result views

Introduce a result-view registry:

```ts
type ResultViewRegistry = Record<string, Component>
```

Resolution order:

1. Named host result view.
2. Existing `#results` slot.
3. Built-in view selected by `resultView.kind`.
4. Generic JSON/debug fallback in development only.

### Built-in ranked view

Improve `RankedList.vue` to support normalized results:

- Title and snippet.
- Score.
- Source and jurisdiction.
- Date, court, language, ECLI, and case number.
- Official-source link.
- Empty state.
- Partial-result warnings.
- Pagination/load-more hook where supported.

Do not infer success counts only from arrays or `nodes`; use the normalized result contract.

## Phase 7: Remaining Legal Data Hunter tools

Deliver these after search and discovery are stable.

### Document retrieval

- Add “View document” per result.
- Call `get_document(source, source_id)`.
- Render full text and metadata through a document-view slot/registry.
- Handle unavailable or truncated text.
- Cache loaded documents in session memory.

### Citation resolution

Add an optional standalone mode or secondary panel with:

- `reference`
- `hint_country`
- `hint_type`

Resolved references should reuse normalized result/document views.

### Source issue reporting

Add an action on source/document views with:

- Source.
- Issue type.
- Description.
- Explicit confirmation before submission.
- Success acknowledgement.
- Permission/capability check.

Do not expose this action unless the adapter advertises support.

## Error, security, and accessibility requirements

### Errors

Normalize errors into stable codes such as:

- `AUTH_REQUIRED`
- `PERMISSION_DENIED`
- `RATE_LIMITED`
- `PROVIDER_UNAVAILABLE`
- `INVALID_CONFIGURATION`
- `INVALID_REQUEST`
- `OPERATION_UNSUPPORTED`
- `NETWORK_ERROR`

Expose retry timing for rate limits when supplied by the backend.

### Security

- No MCP token, API key, or OAuth refresh token in browser state.
- Backend allowlist for tools and providers.
- Validate manifests and requests on both sides.
- Treat provider text, snippets, and document contents as untrusted.
- Avoid rendering provider HTML with `v-html`.
- Require explicit confirmation for issue reports.
- Redact sensitive transport details from user-facing errors.

### Accessibility

- Keyboard-accessible selectors and field reordering.
- Proper labels, descriptions, and error associations.
- `aria-live` regions for discovery and search status.
- Focus management after failed validation.
- Do not rely on color alone for availability or errors.

## Testing strategy

### Pure unit tests

Expand tests for:

- Manifest v1/v2/v3 resolution.
- Field ordering and visibility.
- Required-field locking.
- Conditional validation.
- Numeric/date constraints.
- Per-database state isolation.
- LDH request mapping.
- LDH response normalization.
- Error normalization.

### Vue component tests

Add Vitest and Vue Test Utils coverage for:

- Runtime provider/database switching.
- Dynamic discovery loading.
- Stale request cancellation.
- User field customization.
- Required field protection.
- Custom field components.
- Custom result views.
- Existing free and guided forms.
- Backward-compatible events.

### Contract tests

Use a fake host adapter matching all seven LDH operations. Fixtures should include:

- Multiple countries and sources.
- Sources covering multiple namespaces.
- Empty search results.
- Rate limiting.
- Authentication failure.
- Missing metadata.
- Truncated document text.
- Ambiguous citation resolution.

Normal tests must not call the live Legal Data Hunter service.

### Build and declaration checks

CI should run:

```text
npm test
npm run typecheck
npm run build
npm run build:demo
```

Add a declaration test that imports every new public contract from the built package.

## Demo and documentation

Update the demo into an integration harness with:

- Static legacy datasets.
- Generic runtime provider.
- Mock Legal Data Hunter provider.
- Country/source discovery.
- User field tailoring.
- Ranked, custom, and slot-based result views.
- Document retrieval.
- Citation resolution.
- Source issue reporting.
- Error and rate-limit simulation.

Document:

1. Static dataset configuration.
2. Runtime manifest configuration.
3. Implementing `LegalSearchAdapter`.
4. Backend MCP bridge responsibilities.
5. Legal Data Hunter mapping.
6. Custom field components.
7. Custom result views.
8. Migration from `onSubmit`.
9. Security guidance.
10. Manifest versioning.

## Likely files affected

Within this repository:

- `src/components/LegalDocsForm.vue`
- `src/components/DatasetFieldsForm.vue`
- `src/components/FieldBlock.vue`
- `src/components/RankedList.vue`
- `src/components/blocks/DatasetSelector.vue`
- `src/components/types.ts`
- `src/components/datasets.ts`
- `src/components/datasetFields.ts`
- `src/index.ts`
- `src/index.d.ts`
- New runtime/provider composables and generic field controls.
- `demo/*`
- `test/*`
- `README.md`
- `docs/*`
- `package.json`

Coordinated shared-contract changes:

- `legal-retrieval-types/src/dataset.ts`
- `legal-retrieval-types/src/retrieval.ts`
- `legal-retrieval-types/src/manifest.ts`
- Its tests, declarations, and package version.

## Recommended delivery sequence

1. Shared v3 contracts and migration support.
2. Runtime adapter and state composable.
3. Provider/database selector.
4. Generic field renderer and field customization.
5. LDH discovery adapter.
6. LDH search and normalized ranked results.
7. Pluggable result views.
8. Document retrieval and citation resolution.
9. Source issue reporting.
10. Compatibility hardening, documentation, and release.

## Definition of done

The work is complete when an end user can select Legal Data Hunter, choose a corpus/country/source, tailor optional fields, run a search through a backend MCP bridge, render normalized results through a chosen view, retrieve documents, resolve references, and report source issues—without exposing credentials or breaking existing RS/ECHR consumers.
