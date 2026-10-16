// The runtime state of a configurable search form.
//
// This is the boundary between the form and a host adapter. The form never
// reaches a provider — it resolves a manifest into providers/databases, keeps
// per-database field state, and calls the adapter the host mounted, which is
// normally backed by a server-side bridge that holds the credential.
//
// Pure layout/validation logic lives in `runtimeState.ts`; this file owns the
// Vue reactivity and the adapter calls.

import { computed, inject, provide, reactive, ref, watch, type InjectionKey, type Ref } from 'vue'
import type {
  DiscoveryOption,
  LegalDatabaseDescriptor,
  LegalSearchAdapter,
  LegalSearchProviderDescriptor,
  NormalizedSearchResult,
  ProviderFilterSet,
  ProviderOperation,
  ProviderSearchRequest,
  QueryBuilderManifest,
  ResolvedLegalSearchConfig,
} from 'legal-retrieval-types'
import {
  ProviderOperationError,
  resolveLegalSearchConfigFromManifest,
} from 'legal-retrieval-types'
import {
  collectParams,
  databasesForProvider,
  defaultDatabaseForProvider,
  defaultFieldValues,
  isUserConfigurable,
  mergeFieldOptions,
  moveField as moveFieldInLayout,
  resetFieldLayout,
  resolveVisibleFields,
  setFieldVisible,
  validateFields,
  type FieldLayout,
  type FieldValidation,
} from './runtimeState'

/** The field state of one database, kept apart from every other database's. */
export interface DatabaseFormState {
  values: Record<string, unknown>
  layout: FieldLayout
  loading: boolean
  validated: boolean
  result?: NormalizedSearchResult
  error?: ProviderOperationError
}

/** The discovery state of the active provider. */
export interface RuntimeDiscoveryState {
  loading: boolean
  countries: DiscoveryOption[]
  sources: DiscoveryOption[]
  filters?: ProviderFilterSet
  error?: ProviderOperationError
}

export interface UseLegalSearchRuntimeOptions {
  /** A manifest to resolve. When it is a ref, a change re-resolves the runtime. */
  manifest?:
    | QueryBuilderManifest
    | Ref<QueryBuilderManifest | undefined>
    | { value: QueryBuilderManifest | undefined }
  /** Fetch the manifest when none was passed. */
  loadManifest?: () => Promise<QueryBuilderManifest | unknown>
  /** The host adapter. A missing adapter means the form only ever emits. */
  adapter?: LegalSearchAdapter
  initialProvider?: string
  initialDatabase?: string
}

/**
 * Turns a provider failure into a stable error the form can render. An error
 * the adapter already normalized is passed through untouched.
 */
export function normalizeAdapterError(
  error: unknown,
  operation: ProviderOperation,
  provider?: string,
): ProviderOperationError {
  if (error instanceof ProviderOperationError) return error
  return new ProviderOperationError(
    'NETWORK_ERROR',
    error instanceof Error ? error.message : String(error),
    { operation, provider },
  )
}

function isRef(value: unknown): value is Ref<unknown> {
  return typeof value === 'object' && value !== null && 'value' in (value as object)
}

export function useLegalSearchRuntime(options: UseLegalSearchRuntimeOptions = {}) {
  const config = ref<ResolvedLegalSearchConfig | null>(null)
  const configError = ref<unknown>(undefined)
  const loadingManifest = ref(false)

  const providerId = ref<string | undefined>(undefined)
  const databaseId = ref<string | undefined>(undefined)

  // Discovery selection: the country narrows which sources are offered, and the
  // chosen source's filters seed the form's option lists.
  const discoveryCountry = ref<string | undefined>(undefined)
  const discoverySource = ref<string | undefined>(undefined)

  // State is keyed per provider+cluster so switching providers or databases
  // never mixes one corpus's answers into another's.
  const states = reactive<Record<string, DatabaseFormState>>({})
  const discovery = reactive<RuntimeDiscoveryState>({
    loading: false,
    countries: [],
    sources: [],
    filters: undefined,
    error: undefined,
  })

  let discoverySequence = 0

  const providers = computed<LegalSearchProviderDescriptor[]>(() => config.value?.providers ?? [])
  const databases = computed<LegalDatabaseDescriptor[]>(() => config.value?.databases ?? [])

  const activeProvider = computed(() =>
    providers.value.find((provider) => provider.id === providerId.value),
  )
  const activeDatabase = computed(() =>
    databases.value.find((database) => database.id === databaseId.value),
  )
  const databasesOfActiveProvider = computed(() =>
    databasesForProvider(databases.value, providerId.value),
  )

  const activeFields = computed(() =>
    mergeFieldOptions(activeDatabase.value?.fields ?? [], discovery.filters),
  )

  function stateKey(provider: string | undefined, database: string | undefined): string {
    return `${provider ?? ''}::${database ?? ''}`
  }

  function stateFor(
    provider: string | undefined = providerId.value,
    database: string | undefined = databaseId.value,
  ): DatabaseFormState {
    const key = stateKey(provider, database)
    let state = states[key]
    if (!state) {
      const databaseEntry = databases.value.find((entry) => entry.id === database)
      state = reactive<DatabaseFormState>({
        values: defaultFieldValues(databaseEntry?.fields ?? []),
        layout: resetFieldLayout(),
        loading: false,
        validated: false,
      })
      states[key] = state
    }
    return state
  }

  const activeState = computed<DatabaseFormState>(() => stateFor())
  const activeValues = computed(() => activeState.value.values)
  const activeLayout = computed(() => activeState.value.layout)
  const visibleFields = computed(() =>
    resolveVisibleFields(activeFields.value, activeState.value.layout, activeState.value.values),
  )

  /** Present only when a manifest resolved; false keeps the legacy form path. */
  const ready = computed(() => config.value !== null)
  const hasDeclaredFields = computed(() => activeFields.value.length > 0)

  function adopt(input: unknown): void {
    try {
      const resolved = resolveLegalSearchConfigFromManifest(input)
      config.value = resolved

      const wantedProvider =
        options.initialProvider && resolved.providers.some((p) => p.id === options.initialProvider)
          ? options.initialProvider
          : resolved.defaultProvider
      providerId.value = wantedProvider

      const providerDefault = defaultDatabaseForProvider(
        resolved.providers,
        resolved.databases,
        wantedProvider,
      )
      const wantedDatabase =
        options.initialDatabase &&
        resolved.databases.some(
          (database) => database.id === options.initialDatabase && database.provider === wantedProvider,
        )
          ? options.initialDatabase
          : resolved.defaultDatabase && resolved.databases.some((d) => d.id === resolved.defaultDatabase)
            ? resolved.defaultDatabase
            : providerDefault
      databaseId.value = wantedDatabase

      configError.value = undefined
      stateFor()
      void refreshDiscovery()
    } catch (error) {
      config.value = null
      configError.value = error
    }
  }

  async function load(): Promise<void> {
    const source = options.manifest
    if (source !== undefined) {
      adopt(isRef(source) ? source.value : source)
      return
    }
    if (!options.loadManifest) return

    loadingManifest.value = true
    try {
      adopt(await options.loadManifest())
    } catch (error) {
      configError.value = error
      config.value = null
    } finally {
      loadingManifest.value = false
    }
  }

  function setProvider(id: string): void {
    if (!providers.value.some((provider) => provider.id === id)) return
    providerId.value = id
    databaseId.value = defaultDatabaseForProvider(providers.value, databases.value, id)
    void refreshDiscovery()
  }

  function setDatabase(id: string): void {
    const database = databases.value.find((entry) => entry.id === id)
    if (!database) return
    if (database.provider !== providerId.value) providerId.value = database.provider
    databaseId.value = id
    void refreshDiscovery()
  }

  function setValue(key: string, value: unknown): void {
    stateFor().values[key] = value
  }

  function setValues(values: Record<string, unknown>): void {
    Object.assign(stateFor().values, values)
  }

  function toggleField(key: string, visible: boolean): void {
    if (!activeDatabase.value) return
    const state = stateFor()
    const field = activeFields.value.find((entry) => entry.key === key)
    if (!field || !isUserConfigurable(field)) return
    if (visible) state.values[key] = state.values[key] ?? undefined
    state.layout = setFieldVisible(activeFields.value, state.layout, key, visible)
  }

  function moveField(key: string, delta: number): void {
    const state = stateFor()
    state.layout = moveFieldInLayout(activeFields.value, state.layout, key, delta)
  }

  function resetLayout(): void {
    stateFor().layout = resetFieldLayout()
  }

  /** Clears the active database's answers, layout and last result. */
  function resetDatabaseState(): void {
    const state = stateFor()
    state.values = defaultFieldValues(activeDatabase.value?.fields ?? [])
    state.layout = resetFieldLayout()
    state.result = undefined
    state.error = undefined
    state.validated = false
  }

  function validate(): FieldValidation {
    const state = stateFor()
    state.validated = true
    return validateFields(activeFields.value, state.values)
  }

  function buildRequest(cursor?: string): ProviderSearchRequest | undefined {
    if (!providerId.value || !databaseId.value) return undefined
    return {
      provider: providerId.value,
      database: databaseId.value,
      params: collectParams(activeFields.value, stateFor().values),
      ...(cursor ? { cursor } : {}),
    }
  }

  /**
   * Collects the active database's params and runs the host adapter. Resolves
   * with the normalized result, or undefined when there is no adapter to call.
   */
  async function search(): Promise<NormalizedSearchResult | undefined> {
    const adapter = options.adapter
    const request = buildRequest()
    if (!adapter?.search || !request) return undefined

    const state = stateFor()
    state.loading = true
    state.error = undefined
    try {
      const result = await adapter.search(request)
      state.result = result
      return result
    } catch (error) {
      state.error = normalizeAdapterError(error, 'search', request.provider)
      throw state.error
    } finally {
      state.loading = false
    }
  }

  function resetDiscovery(): void {
    discoverySequence += 1
    discovery.loading = false
    discovery.countries = []
    discovery.sources = []
    discovery.filters = undefined
    discovery.error = undefined
    discoveryCountry.value = undefined
    discoverySource.value = undefined
  }

  function discoveryRequest(): { provider: string; database?: string } | undefined {
    if (!providerId.value) return undefined
    return {
      provider: providerId.value,
      ...(databaseId.value ? { database: databaseId.value } : {}),
    }
  }

  /** Reloads the provider's countries and drops any country/source selection. */
  async function refreshDiscovery(): Promise<void> {
    resetDiscovery()
    if (options.adapter?.discoverCountries) await discoverCountries()
  }

  /**
   * Picks the country whose sources to offer. A new country invalidates the
   * source chosen under the old one, and reloads the source list.
   */
  function setDiscoveryCountry(code: string | undefined): void {
    discoveryCountry.value = code
    discoverySource.value = undefined
    discovery.sources = []
    discovery.filters = undefined
    if (code) void discoverSources(code)
    else discoverySequence += 1
  }

  /** Picks the source whose filters seed the form, loading them. */
  function setDiscoverySource(id: string | undefined): void {
    discoverySource.value = id
    discovery.filters = undefined
    if (id) void loadFilters(id)
  }

  /** Runs a discovery call, guarded so a slow reply cannot overwrite a newer one. */
  async function runDiscovery<T>(
    operation: ProviderOperation,
    call: () => Promise<T>,
    apply: (value: T) => void,
  ): Promise<void> {
    const sequence = ++discoverySequence
    discovery.loading = true
    discovery.error = undefined
    try {
      const value = await call()
      if (sequence !== discoverySequence) return
      apply(value)
    } catch (error) {
      if (sequence !== discoverySequence) return
      discovery.error = normalizeAdapterError(error, operation, providerId.value)
    } finally {
      if (sequence === discoverySequence) discovery.loading = false
    }
  }

  async function discoverCountries(): Promise<void> {
    const adapter = options.adapter
    const request = discoveryRequest()
    if (!adapter?.discoverCountries || !request) return
    await runDiscovery(
      'discoverCountries',
      () => adapter.discoverCountries!(request),
      (countries) => {
        discovery.countries = countries
      },
    )
  }

  async function discoverSources(country?: string): Promise<void> {
    const adapter = options.adapter
    const request = discoveryRequest()
    if (!adapter?.discoverSources || !request) return
    await runDiscovery(
      'discoverSources',
      () => adapter.discoverSources!({ ...request, ...(country ? { country } : {}) }),
      (sources) => {
        discovery.sources = sources
      },
    )
  }

  async function loadFilters(source: string): Promise<void> {
    const adapter = options.adapter
    const request = discoveryRequest()
    if (!adapter?.getFilters || !request) return
    await runDiscovery(
      'getFilters',
      () => adapter.getFilters!({ ...request, source }),
      (filters) => {
        discovery.filters = filters
      },
    )
  }

  // Resolve an initially-passed manifest, and re-resolve it when a ref changes.
  const manifestRef = options.manifest
  if (manifestRef !== undefined && isRef(manifestRef)) {
    watch(manifestRef, (value) => {
      if (value !== undefined) adopt(value)
    })
  }

  return {
    // config
    config,
    configError,
    loadingManifest,
    ready,
    load,

    // selection
    providers,
    databases,
    providerId,
    databaseId,
    activeProvider,
    activeDatabase,
    databasesOfActiveProvider,
    setProvider,
    setDatabase,

    // fields
    activeFields,
    visibleFields,
    hasDeclaredFields,
    activeValues,
    activeLayout,
    activeState,
    setValue,
    setValues,
    toggleField,
    moveField,
    resetLayout,
    resetDatabaseState,
    stateFor,

    // validation + search
    validate,
    buildRequest,
    search,

    // discovery
    discovery,
    discoveryCountry,
    discoverySource,
    discoverCountries,
    discoverSources,
    loadFilters,
    refreshDiscovery,
    setDiscoveryCountry,
    setDiscoverySource,
  }
}

export type LegalSearchRuntime = ReturnType<typeof useLegalSearchRuntime>

const RUNTIME_KEY: InjectionKey<LegalSearchRuntime> = Symbol('legal-search-runtime')

/** Called by LegalDocsForm so its picker and field renderer can reach the runtime. */
export function provideLegalSearchRuntime(runtime: LegalSearchRuntime): void {
  provide(RUNTIME_KEY, runtime)
}

/** The runtime the form provided, or undefined when mounted outside one. */
export function useLegalSearchRuntimeContext(): LegalSearchRuntime | undefined {
  return inject(RUNTIME_KEY, undefined)
}
