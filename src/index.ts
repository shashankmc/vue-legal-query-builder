import type { App, Plugin, Component } from "vue";

// Export components
import LegalDocsForm from "./components/LegalDocsForm.vue";
export { LegalDocsForm };
import RankedList from "./components/RankedList.vue";
export { RankedList };
import ResultTable from "./components/ResultTable.vue";
export { ResultTable };
export type { SearchLaws } from "./components/hostCallbacks";
export type { LegalDocsFormProps, Dataset, DatasetDescriptor, FieldDescriptor, ResultViewRef, LegalDocsQuery, Goal, GoalFixedParameters, GuidedStructure, GuidedTemplate, GuidedTemplateId, Step, Block } from "./components/types";
export { BUILT_IN_DATASETS, FormType, BlockType } from "./components/types";

// Result shaping: whatever a search returned, flattened for a view. Pure, and
// shared by the built-in ranked list and any host view.
export {
  toResultEntries,
  isNormalizedSearchResult,
  scorePercent,
  formatScore,
} from "./components/resultEntries";
export type { ResultEntry, ResultEntries } from "./components/resultEntries";

// Result fields: which columns a result set can show, worked out from the hits
// and the provider's field catalogue (`resultView.config.fields`).
export {
  resultFieldsFromView,
  resultFieldValue,
  humanizeFieldKey,
  availableResultFields,
  defaultResultColumns,
  resolveResultColumns,
  resultColumnsStorageKey,
  formatResultValue,
} from "./components/resultFields";
export type { ResultFieldDescriptor, ResultFieldType } from "./components/resultFields";

/** Host result views, keyed by `ResultViewRef.kind`. */
export type ResultViewRegistry = Record<string, Component>;

// The provider-agnostic runtime: the providers/databases a manifest resolves to
// and the host adapter the form calls. See
// docs/runtime-configurable-legal-search-builder.md.
export type {
  FieldControl,
  FieldDependency,
  LegalDatabaseDescriptor,
  LegalSearchProviderDescriptor,
  LegalSearchAdapter,
  QueryBuilderManifest,
  QueryBuilderManifestV1,
  QueryBuilderManifestV2,
  QueryBuilderManifestV3,
  ResolvedLegalSearchConfig,
  ProviderOperation,
  ProviderOperationErrorCode,
  DiscoveryOption,
  ProviderFilterSet,
  NormalizedSearchResult,
  NormalizedSearchHit,
  NormalizedLegalDocument,
  ResolvedLegalReference,
} from "./components/types";
export { ProviderOperationError } from "legal-retrieval-types";

// Backend-dependency helpers: what a provider needs configured, and the
// scaffold an operator gets. No credential crosses this boundary — these
// describe the requirement, never a value. See README "Credentials".
export {
  requiredDependencies,
  unmetDependencies,
  dependencyHint,
  methodsWithDependencies,
  buildDependencyScaffold,
} from "legal-retrieval-types";

export {
  useLegalSearchRuntime,
  useLegalSearchRuntimeContext,
  provideLegalSearchRuntime,
  normalizeAdapterError,
} from "./components/runtime/useLegalSearchRuntime";
export type {
  LegalSearchRuntime,
  DatabaseFormState,
  RuntimeDiscoveryState,
  UseLegalSearchRuntimeOptions,
} from "./components/runtime/useLegalSearchRuntime";
export {
  isUserConfigurable,
  defaultFieldValues,
  orderFields,
  applyLayout,
  resolveVisibleFields,
  dependencySatisfied,
  setFieldVisible,
  moveField,
  resetFieldLayout,
  validateFields,
  filterAdvanced,
  collectParams,
  mergeFieldOptions,
  DISCOVERY_FIELD_KEYS,
  databasesForProvider,
  providerForDatabase,
  defaultDatabaseForProvider,
  defaultProviderFor,
  EMPTY_FIELD_LAYOUT,
} from "./components/runtime/runtimeState";
export type { FieldLayout, FieldValidation } from "./components/runtime/runtimeState";

// Legal Data Hunter, described once: the manifest a form renders, the mapping
// onto the provider's `search` arguments, and the normalization of its
// responses. Pure — a host supplies the transport via the adapter's `call`.
export {
  LEGAL_DATA_HUNTER_PROVIDER_ID,
  LEGAL_DATA_HUNTER_NAMESPACES,
  legalDataHunterManifest,
  namespaceForDatabase,
  toLegalDataHunterSearchArgs,
  toLegalDataHunterResolveArgs,
  toLegalDataHunterIssueArgs,
  normalizeLegalDataHunterHit,
  normalizeLegalDataHunterSearch,
  normalizeLegalDataHunterDocument,
  normalizeLegalDataHunterCountries,
  normalizeLegalDataHunterSources,
  normalizeLegalDataHunterFilters,
  normalizeLegalDataHunterResolvedReference,
  createLegalDataHunterAdapter,
  LEGAL_DATA_HUNTER_BASE_URL,
  LEGAL_DATA_HUNTER_RESULT_FIELDS,
  toLegalDataHunterRestRequest,
} from "./providers/legalDataHunter";
export type {
  LegalDataHunterOperation,
  LegalDataHunterNamespace,
  LegalDataHunterSearchArgs,
  LegalDataHunterResolveArgs,
  LegalDataHunterIssueArgs,
  LegalDataHunterContext,
  LegalDataHunterAdapterOptions,
  LegalDataHunterRestRequest,
} from "./providers/legalDataHunter";

// The declarative dataset field schema: a generic, app-agnostic provisions
// dataset plus the pure collect/validate helpers a host can reuse.
export { provisionsDataset } from "./components/datasets";
export { collectDatasetParams, validateDatasetFields, isFieldFilled, hasDeclaredFields } from "./components/datasetFields";

// The guided structures this package ships, so a host can list them in a picker
// instead of authoring a structure of its own.
export {
  guidedTemplates,
  getGuidedTemplate,
  resolveGuidedStructure,
  DEFAULT_GUIDED_TEMPLATE_ID,
  caselawSearch,
} from "./templates";

// The API's data contract, re-exported so a consumer needs one import.
//
// Types only. This package deliberately re-exports no client: it does not call
// the API, and neither should the page it renders in. A host that needs to make
// requests uses node-legal-docs-client on its own server.
import type {
  RechtspraakQueryParameters,
  RechtspraakDocument,
  RechtspraakFullTextDocument,
  EchrQueryParameters,
  EchrDocument,
  EchrFullTextDocument,
} from "legal-docs-types";
export type {
  RechtspraakQueryParameters,
  RechtspraakDocument,
  RechtspraakFullTextDocument,
  EchrQueryParameters,
  EchrDocument,
  EchrFullTextDocument,
};
export { DocType } from "legal-docs-types";


// Vue plugin for registering components globally
export const VueLegalQueryBuilderPlugin: Plugin = {
  install(app: App) {
    app.component("LegalDocsForm", LegalDocsForm);
  },
};

// Default export for convenience
export default VueLegalQueryBuilderPlugin;
