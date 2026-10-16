import type { Component, DefineComponent, Plugin, Ref } from "vue";
import type {
  RechtspraakQueryParameters,
  RechtspraakDocument,
  RechtspraakFullTextDocument,
  EchrQueryParameters,
  EchrDocument,
  EchrFullTextDocument,
  BWBItem,
} from "legal-docs-types";
import type {
  DatasetDescriptor,
  FieldDescriptor,
  ResultViewRef,
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
  ProviderSearchRequest,
  DiscoveryOption,
  ProviderFilterSet,
  NormalizedSearchResult,
  NormalizedSearchHit,
  NormalizedLegalDocument,
  ResolvedLegalReference,
  ReferenceMatchType,
  SourceIssueType,
} from "legal-retrieval-types";

export type {
  DatasetDescriptor,
  FieldDescriptor,
  ResultViewRef,
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
  ReferenceMatchType,
  SourceIssueType,
};

export { ProviderOperationError } from "legal-retrieval-types";

/**
 * Backend-dependency helpers: what a provider needs configured, and the
 * scaffold an operator gets. These describe the requirement — they never carry
 * a credential value.
 */
export declare function requiredDependencies(method: import("legal-retrieval-types").MethodDescriptor): import("legal-retrieval-types").DependencyDescriptor[];
export declare function unmetDependencies(method: import("legal-retrieval-types").MethodDescriptor): import("legal-retrieval-types").DependencyDescriptor[];
export declare function dependencyHint(method: import("legal-retrieval-types").MethodDescriptor): string;
export declare function methodsWithDependencies(methods: import("legal-retrieval-types").MethodDescriptor[]): import("legal-retrieval-types").MethodDescriptor[];
export declare function buildDependencyScaffold(methods: import("legal-retrieval-types").MethodDescriptor[]): string;

/** Searches legislation by name. Supplied by the host. */
export declare type SearchLaws = (query: string) => Promise<BWBItem[]>;

export declare enum FormType {
  FREE = "free",
  GUIDED = "guided",
}

export declare enum BlockType {
  ARTICLE_FIELD = "ArticleField",
  DATASET_SELECTOR = "DatasetSelector",
  DATE_RANGE = "DateRange",
  DOC_TYPE_SELECTOR = "DocTypeSelector",
  DOMAINS_SELECTOR = "DomainsSelector",
  ECLIS_INPUT = "EclisInput",
  FACTS_INPUT = "FactsInput",
  IMPORTANCE_LEVEL_SELECTOR = "ImportanceLevelSelector",
  INSTANCES_SELECTOR = "InstancesSelector",
  KEYWORDS_INPUT = "KeywordsInput",
  NETWORK_DEGREES = "NetworkDegrees",
  REASONING_INPUT = "ReasoningInput",
  SELECTED_LAWS = "SelectedLaws",
  TEXT_INPUT = "TextInput",
  TEXTAREA_INPUT = "TextAreaInput",
}

/**
 * Dataset a query targets. The built-ins are RS, ECHR and CJEU (CJEU has no
 * backing endpoint yet and stays disabled), but the type stays open so a host
 * can register a dataset of its own.
 */
export type Dataset = "RS" | "ECHR" | "CJEU" | (string & {});

export interface Block {
  type: BlockType;
  title: string;
  description: string;
  placeholder?: string;
  required?: boolean;
}

export interface Step {
  title: string;
  blocks: Block[];
}

export type GoalFixedParameters = Partial<RechtspraakQueryParameters> & Partial<EchrQueryParameters>;

export interface Goal {
  title: string;
  description: string;
  icon?: string;
  dataset?: Dataset;
  fixedParameters?: GoalFixedParameters;
  steps: Step[];
}

export interface GuidedStructure {
  goals: Goal[];
}

/** Ids of the guided structures shipped with this package. */
export type GuidedTemplateId = "caselaw-search";

/** A guided structure the package ships, described well enough for a host to list it in a picker. */
export interface GuidedTemplate {
  id: GuidedTemplateId;
  name: string;
  description: string;
  structure: GuidedStructure;
}

/** The guided structures this package ships. */
export declare const guidedTemplates: GuidedTemplate[];

/** Used when guided mode is asked for without a structure or a template id. */
export declare const DEFAULT_GUIDED_TEMPLATE_ID: GuidedTemplateId;

export declare function getGuidedTemplate(id: GuidedTemplateId | string): GuidedTemplate | undefined;

/**
 * Picks the structure a guided form should render: an explicit structure wins,
 * then the named template, and failing both the default template.
 */
export declare function resolveGuidedStructure(
  structure?: GuidedStructure,
  templateId?: GuidedTemplateId | string,
): GuidedStructure;

export declare const caselawSearch: GuidedStructure;

export type LegalDocsQuery =
  | { dataset: "RS"; params: RechtspraakQueryParameters }
  | { dataset: "ECHR"; params: EchrQueryParameters }
  | { dataset: string; params: Record<string, unknown> };

/**
 * A dataset a host offers in the picker. The built-ins are RS, ECHR and CJEU;
 * a host can pass its own list to plug in a corpus this package does not know.
 * A dataset may declare `fields` to collect its parameters generically.
 */

/** The datasets offered when a host passes no `datasets` prop. */
export declare const BUILT_IN_DATASETS: DatasetDescriptor[];

/** A generic, app-agnostic provisions dataset (BlueLab is one host that uses it). */
export declare const provisionsDataset: DatasetDescriptor;

/** The params a dataset's declared fields collected. */
export declare function collectDatasetParams(
  dataset: DatasetDescriptor,
  values: Record<string, unknown>,
): Record<string, unknown>;

/** Whether every `required` field has a value. */
export declare function validateDatasetFields(
  dataset: DatasetDescriptor,
  values: Record<string, unknown>,
): boolean;

/** Whether a collected value counts as filled. */
export declare function isFieldFilled(value: unknown): boolean;

/** Whether a dataset declares a field schema. */
export declare function hasDeclaredFields(dataset: DatasetDescriptor | undefined): boolean;

// ---------------------------------------------------------------------------
// Provider-agnostic runtime
// ---------------------------------------------------------------------------

/** Which optional fields a user hid, and the order they put the rest in. */
export interface FieldLayout {
  hidden: string[];
  order: string[];
}

export declare const EMPTY_FIELD_LAYOUT: FieldLayout;

export interface FieldValidation {
  valid: boolean;
  missing: string[];
  errors: Record<string, string>;
}

export declare function resetFieldLayout(): FieldLayout;
export declare function isUserConfigurable(field: FieldDescriptor): boolean;
export declare function defaultFieldValues(fields: FieldDescriptor[]): Record<string, unknown>;
export declare function orderFields(fields: FieldDescriptor[], layout: FieldLayout): FieldDescriptor[];
export declare function applyLayout(fields: FieldDescriptor[], layout: FieldLayout): FieldDescriptor[];
export declare function dependencySatisfied(
  field: FieldDescriptor,
  values: Record<string, unknown>,
): boolean;
export declare function resolveVisibleFields(
  fields: FieldDescriptor[],
  layout: FieldLayout,
  values: Record<string, unknown>,
): FieldDescriptor[];
export declare function setFieldVisible(
  fields: FieldDescriptor[],
  layout: FieldLayout,
  key: string,
  visible: boolean,
): FieldLayout;
export declare function moveField(
  fields: FieldDescriptor[],
  layout: FieldLayout,
  key: string,
  delta: number,
): FieldLayout;
export declare function validateFields(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
): FieldValidation;
/** Splits a field list by the advanced toggle. */
export declare function filterAdvanced(
  fields: FieldDescriptor[],
  showAdvanced: boolean,
): FieldDescriptor[];
export declare function collectParams(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
): Record<string, unknown>;
/** Which field key a discovery answer's options belong to (plural → singular). */
export declare const DISCOVERY_FIELD_KEYS: Record<string, string>;
/** The discovery answers that can seed a field's option list. */
export interface DiscoveryInputs {
  filters?: ProviderFilterSet;
  countries?: DiscoveryOption[];
  sources?: DiscoveryOption[];
}
/** Fills each field's `options` from what the provider has discovered. */
export declare function mergeFieldOptions(
  fields: FieldDescriptor[],
  discovery: DiscoveryInputs | undefined,
): FieldDescriptor[];
export declare function databasesForProvider(
  databases: LegalDatabaseDescriptor[],
  providerId: string | undefined,
): LegalDatabaseDescriptor[];
export declare function providerForDatabase(
  providers: LegalSearchProviderDescriptor[],
  databases: LegalDatabaseDescriptor[],
  databaseId: string | undefined,
): LegalSearchProviderDescriptor | undefined;
export declare function defaultDatabaseForProvider(
  providers: LegalSearchProviderDescriptor[],
  databases: LegalDatabaseDescriptor[],
  providerId: string | undefined,
): string | undefined;
export declare function defaultProviderFor(
  providers: LegalSearchProviderDescriptor[],
): string | undefined;

/** The field state of one database, kept apart from every other database's. */
export interface DatabaseFormState {
  values: Record<string, unknown>;
  layout: FieldLayout;
  loading: boolean;
  validated: boolean;
  result?: NormalizedSearchResult;
  error?: any;
}

/** The discovery state of the active provider. */
export interface RuntimeDiscoveryState {
  loading: boolean;
  countries: DiscoveryOption[];
  sources: DiscoveryOption[];
  filters?: ProviderFilterSet;
  error?: any;
}

export interface UseLegalSearchRuntimeOptions {
  /** A manifest to resolve. When it is a ref, a change re-resolves the runtime. */
  manifest?:
    | QueryBuilderManifest
    | Ref<QueryBuilderManifest | undefined>
    | { value: QueryBuilderManifest | undefined };
  /** Fetch the manifest when none was passed. */
  loadManifest?: () => Promise<QueryBuilderManifest | unknown>;
  /** The host adapter. A missing adapter means the form only ever emits. */
  adapter?: LegalSearchAdapter;
  initialProvider?: string;
  initialDatabase?: string;
}

/** The runtime state of a configurable search form. */
export interface LegalSearchRuntime {
  config: Ref<ResolvedLegalSearchConfig | null>;
  configError: Ref<unknown>;
  loadingManifest: Ref<boolean>;
  ready: Ref<boolean>;
  load(): Promise<void>;

  providers: Ref<LegalSearchProviderDescriptor[]>;
  databases: Ref<LegalDatabaseDescriptor[]>;
  providerId: Ref<string | undefined>;
  databaseId: Ref<string | undefined>;
  activeProvider: Ref<LegalSearchProviderDescriptor | undefined>;
  activeDatabase: Ref<LegalDatabaseDescriptor | undefined>;
  databasesOfActiveProvider: Ref<LegalDatabaseDescriptor[]>;
  setProvider(id: string): void;
  setDatabase(id: string): void;

  activeFields: Ref<FieldDescriptor[]>;
  visibleFields: Ref<FieldDescriptor[]>;
  hasDeclaredFields: Ref<boolean>;
  /** Whether users may show/hide and reorder optional fields. */
  allowFieldCustomization: Ref<boolean>;
  /** Whether the fields marked `advanced` are on screen. */
  showAdvancedFields: Ref<boolean>;
  setShowAdvanced(value: boolean): void;
  activeValues: Ref<Record<string, unknown>>;
  activeLayout: Ref<FieldLayout>;
  activeState: Ref<DatabaseFormState>;
  setValue(key: string, value: unknown): void;
  setValues(values: Record<string, unknown>): void;
  toggleField(key: string, visible: boolean): void;
  moveField(key: string, delta: number): void;
  resetLayout(): void;
  /** Clears the active database's answers, layout and last result. */
  resetDatabaseState(): void;
  stateFor(provider?: string, database?: string): DatabaseFormState;

  validate(): FieldValidation;
  buildRequest(cursor?: string): ProviderSearchRequest | undefined;
  search(): Promise<NormalizedSearchResult | undefined>;

  discovery: RuntimeDiscoveryState;
  /** Country whose sources are offered, when the provider supports discovery. */
  discoveryCountry: Ref<string | undefined>;
  /** Source whose filters seed the form, when the provider supports discovery. */
  discoverySource: Ref<string | undefined>;
  discoverCountries(): Promise<void>;
  discoverSources(country?: string): Promise<void>;
  loadFilters(source: string): Promise<void>;
  /** Reloads the provider's countries and drops the country/source selection. */
  refreshDiscovery(): Promise<void>;
  /** Picks the country; a new country clears the source and reloads the list. */
  setDiscoveryCountry(code: string | undefined): void;
  /** Picks the source and loads its filters. */
  setDiscoverySource(id: string | undefined): void;
}

export declare function useLegalSearchRuntime(
  options?: UseLegalSearchRuntimeOptions,
): LegalSearchRuntime;

/** Called by LegalDocsForm so its picker and field renderer can reach the runtime. */
export declare function provideLegalSearchRuntime(runtime: LegalSearchRuntime): void;

/** The runtime the form provided, or undefined when mounted outside one. */
export declare function useLegalSearchRuntimeContext(): LegalSearchRuntime | undefined;

/** Turns a provider failure into a stable error the form can render. */
export declare function normalizeAdapterError(
  error: unknown,
  operation: ProviderOperation,
  provider?: string,
): import("legal-retrieval-types").ProviderOperationError;

export interface LegalDocsFormProps {
  title?: string;
  subtitle?: string;
  type?: FormType;
  /**
   * Datasets the picker offers. Omit to keep the built-ins (RS, ECHR and a
   * disabled CJEU). Pass your own to add a corpus this package does not know.
   */
  datasets?: DatasetDescriptor[];
  /** Guided structure to render. Takes precedence over `guidedTemplate`. */
  guidedStructure?: GuidedStructure;
  /**
   * Id of one of the structures this package ships (see `guidedTemplates`),
   * used when no `guidedStructure` is given. Guided mode falls back to
   * `DEFAULT_GUIDED_TEMPLATE_ID` when neither is set.
   */
  guidedTemplate?: GuidedTemplateId | string;
  onSubmit?: (data: LegalDocsQuery) => Promise<any>;
  /**
   * Searches legislation by name, for the law selector. The form never calls
   * the API itself — point this at your own server.
   */
  onSearchLaws?: SearchLaws;
  /** A provider/database manifest to resolve into a runtime-configurable form. */
  manifest?: QueryBuilderManifest;
  /** Fetch the manifest when none is passed. */
  loadManifest?: () => Promise<QueryBuilderManifest | unknown>;
  /** The host's provider adapter. The form never reaches a provider itself. */
  adapter?: LegalSearchAdapter;
  /** Provider selected on mount. Falls back to the manifest's default. */
  initialProvider?: string;
  /** Database selected on mount. Falls back to the provider's default. */
  initialDatabase?: string;
  /** Custom field components, keyed by `FieldDescriptor.block`. */
  fieldComponents?: Record<string, Component>;
  /** Custom result views, keyed by `ResultViewRef.kind`. */
  resultViews?: Record<string, Component>;
}

export declare const LegalDocsForm: DefineComponent<LegalDocsFormProps, {}, any>;

/** A simple ranked list for provisions-style results. */
export declare const RankedList: DefineComponent<{ result: unknown }, {}, any>;


export { DocType } from "legal-docs-types";

// ---------------------------------------------------------------------------
// Legal Data Hunter
// ---------------------------------------------------------------------------

export declare const LEGAL_DATA_HUNTER_PROVIDER_ID: "ldh";
export declare const LEGAL_DATA_HUNTER_NAMESPACES: readonly ["case_law", "legislation", "doctrine"];
export type LegalDataHunterNamespace = "case_law" | "legislation" | "doctrine";
export type LegalDataHunterOperation =
  | "search"
  | "document"
  | "resolve"
  | "countries"
  | "sources"
  | "filters"
  | "report-issue";

/** The manifest a form renders for Legal Data Hunter. */
export declare const legalDataHunterManifest: QueryBuilderManifestV3;
/** The namespace a database maps to, when the manifest names one. */
export declare function namespaceForDatabase(
  manifest: QueryBuilderManifestV3,
  databaseId: string,
): string | undefined;

export interface LegalDataHunterSearchArgs {
  query: string;
  namespace?: string;
  top_k?: number;
  alpha?: number;
  country?: string[];
  source?: string[];
  court?: string;
  court_tier?: number;
  jurisdiction?: string;
  subdivision?: string;
  language?: string;
  date_start?: string;
  date_end?: string;
}
export interface LegalDataHunterResolveArgs {
  reference: string;
  hint_country?: string;
  hint_type?: string;
}
export interface LegalDataHunterIssueArgs {
  source: string;
  issue_type: SourceIssueType;
  description?: string;
}
export interface LegalDataHunterContext {
  provider: string;
  database: string;
}

export declare function toLegalDataHunterSearchArgs(
  request: ProviderSearchRequest,
): LegalDataHunterSearchArgs;
export declare function toLegalDataHunterResolveArgs(input: {
  reference: string;
  hintCountry?: string;
  hintType?: string;
}): LegalDataHunterResolveArgs;
export declare function toLegalDataHunterIssueArgs(input: {
  source: string;
  issueType: SourceIssueType;
  description?: string;
}): LegalDataHunterIssueArgs;

export declare function normalizeLegalDataHunterHit(
  raw: unknown,
  context: LegalDataHunterContext,
): NormalizedSearchHit;
export declare function normalizeLegalDataHunterSearch(
  raw: unknown,
  context: LegalDataHunterContext,
): NormalizedSearchResult;
export declare function normalizeLegalDataHunterDocument(
  raw: unknown,
  context: LegalDataHunterContext,
): NormalizedLegalDocument;
export declare function normalizeLegalDataHunterCountries(raw: unknown): DiscoveryOption[];
export declare function normalizeLegalDataHunterSources(raw: unknown): DiscoveryOption[];
export declare function normalizeLegalDataHunterFilters(
  raw: unknown,
  source: string,
): ProviderFilterSet;
export declare function normalizeLegalDataHunterResolvedReference(
  raw: unknown,
  context: LegalDataHunterContext & { reference: string },
): ResolvedLegalReference;

export interface LegalDataHunterAdapterOptions {
  /** Sends one operation to the host's server-side bridge. No HTTP here. */
  call(
    operation: LegalDataHunterOperation,
    payload: Record<string, unknown>,
  ): Promise<unknown>;
  manifest?: QueryBuilderManifestV3;
}
/** Maps the generic shapes onto Legal Data Hunter's, using the host's transport. */
export declare function createLegalDataHunterAdapter(
  options: LegalDataHunterAdapterOptions,
): LegalSearchAdapter;



export declare const VueLegalQueryBuilderPlugin: Plugin;

export default VueLegalQueryBuilderPlugin;
