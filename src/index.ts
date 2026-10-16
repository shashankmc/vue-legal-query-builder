import type { App, Plugin } from "vue";

// Export components
import LegalDocsForm from "./components/LegalDocsForm.vue";
export { LegalDocsForm };
import RankedList from "./components/RankedList.vue";
export { RankedList };
export type { SearchLaws } from "./components/hostCallbacks";
export type { LegalDocsFormProps, Dataset, DatasetDescriptor, FieldDescriptor, ResultViewRef, LegalDocsQuery, Goal, GoalFixedParameters, GuidedStructure, GuidedTemplate, GuidedTemplateId, Step, Block } from "./components/types";
export { BUILT_IN_DATASETS, FormType, BlockType } from "./components/types";

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
  FILTER_FIELD_KEYS,
  databasesForProvider,
  providerForDatabase,
  defaultDatabaseForProvider,
  defaultProviderFor,
  EMPTY_FIELD_LAYOUT,
} from "./components/runtime/runtimeState";
export type { FieldLayout, FieldValidation } from "./components/runtime/runtimeState";

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
