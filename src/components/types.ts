import type { Component } from 'vue'
import type { RechtspraakQueryParameters, EchrQueryParameters, BWBItem } from 'legal-docs-types'
import type {
  DatasetDescriptor,
  LegalSearchAdapter,
  QueryBuilderManifest,
} from 'legal-retrieval-types'

export type {
  DatasetDescriptor,
  FieldDescriptor,
  FieldControl,
  FieldDependency,
  ResultViewRef,
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
  NormalizedSearchResult,
  NormalizedSearchHit,
  NormalizedLegalDocument,
  ResolvedLegalReference,
  ReferenceMatchType,
  SourceIssueType,
  DiscoveryOption,
  ProviderFilterSet,
} from 'legal-retrieval-types'

export enum FormType {
  FREE = 'free',
  GUIDED = 'guided',
}

export enum BlockType {
  ARTICLE_FIELD = 'ArticleField',
  DATASET_SELECTOR = 'DatasetSelector',
  DATE_RANGE = 'DateRange',
  DOC_TYPE_SELECTOR = 'DocTypeSelector',
  DOMAINS_SELECTOR = 'DomainsSelector',
  ECLIS_INPUT = 'EclisInput',
  FACTS_INPUT = 'FactsInput',
  IMPORTANCE_LEVEL_SELECTOR = 'ImportanceLevelSelector',
  INSTANCES_SELECTOR = 'InstancesSelector',
  KEYWORDS_INPUT = 'KeywordsInput',
  NETWORK_DEGREES = 'NetworkDegrees',
  REASONING_INPUT = 'ReasoningInput',
  SELECTED_LAWS = 'SelectedLaws',
  TEXT_INPUT = 'TextInput',
  TEXTAREA_INPUT = 'TextAreaInput',
}

/**
 * Dataset a query targets. The built-ins are RS, ECHR and CJEU (CJEU has no
 * backing endpoint yet and stays disabled), but the type stays open so a host
 * can register a dataset of its own. See docs/dataset-agnostic-seam.md.
 */
export type Dataset = 'RS' | 'ECHR' | 'CJEU' | (string & {})

/** The datasets offered when a host passes no `datasets` prop. */
export const BUILT_IN_DATASETS: DatasetDescriptor[] = [
    { id: 'RS', label: 'Rechtspraak', kind: 'case-law' },
    { id: 'ECHR', label: 'ECHR', kind: 'case-law' },
    { id: 'CJEU', label: 'CJEU', kind: 'case-law', disabled: true },
]

export interface Block {
  type: BlockType
  title: string
  description: string
  placeholder?: string
  required?: boolean
}

export interface Step {
  title: string
  blocks: Block[]
}

/** Shared subset of both query shapes; overlapping field names have compatible types across the two APIs. */
export type GoalFixedParameters = Partial<RechtspraakQueryParameters> & Partial<EchrQueryParameters>

export interface Goal {
  title: string
  description: string
  icon?: string
  /** Dataset this goal queries. Applied when the goal is selected, same as fixedParameters; a DATASET_SELECTOR block in its steps can still change it afterwards. */
  dataset?: Dataset
  fixedParameters?: GoalFixedParameters
  steps: Step[]
}

export interface GuidedStructure {
  goals: Goal[]
}

/** Ids of the guided structures shipped with this package. */
export type GuidedTemplateId = 'caselaw-search'

/** A guided structure the package ships, described well enough for a host to list it in a picker. */
export interface GuidedTemplate {
  id: GuidedTemplateId
  name: string
  description: string
  structure: GuidedStructure
}

/**
 * Discriminated union so a host app knows which client method to call with
 * `params`.
 *
 * The first two members are the built-in datasets and keep their typed
 * parameters. The third is the escape hatch: a host that registers a dataset
 * of its own (see `datasets` on LegalDocsFormProps) gets its collected fields
 * back as a plain object under its own dataset id, and translates them itself.
 */
export type LegalDocsQuery =
  | { dataset: 'RS'; params: RechtspraakQueryParameters }
  | { dataset: 'ECHR'; params: EchrQueryParameters }
  | { dataset: string; params: Record<string, unknown> }

export interface LegalDocsFormProps {
  title?: string
  subtitle?: string
  type?: FormType
  /**
   * Datasets the picker offers. Omit to keep the built-ins (RS, ECHR and a
   * disabled CJEU). Pass your own — optionally spreading `BUILT_IN_DATASETS`
   * into it — to add a corpus this package knows nothing about. See
   * docs/dataset-agnostic-seam.md.
   */
  datasets?: DatasetDescriptor[]
  /** Guided structure to render. Takes precedence over `guidedTemplate`. */
  guidedStructure?: GuidedStructure
  /**
   * Id of one of the structures this package ships (see `guidedTemplates`),
   * used when no `guidedStructure` is given. Guided mode falls back to
   * `DEFAULT_GUIDED_TEMPLATE_ID` when neither is set, so it always has
   * something to show.
   */
  guidedTemplate?: GuidedTemplateId | string
  onSubmit?: (data: LegalDocsQuery) => Promise<any>
  /**
   * Searches legislation by name, for the law selector.
   *
   * The form does not call the API itself — that needs a credential, and a
   * credential in a page is readable by anyone using it. Point this at your
   * own server, the same way `onSubmit` is pointed at it.
   *
   * Omitting it leaves the law selector telling the user that search is
   * unavailable, rather than silently returning nothing.
   */
  onSearchLaws?: (query: string) => Promise<BWBItem[]>
  /**
   * A provider/database manifest to resolve into a runtime-configurable form.
   * Passing one switches the form onto the provider-agnostic path: providers
   * and databases come from the manifest, and each database's fields are
   * generated from its declarative schema. See docs/dataset-agnostic-seam.md
   * and docs/runtime-configurable-legal-search-builder.md.
   */
  manifest?: QueryBuilderManifest
  /**
   * Fetch the manifest when none is passed, so the form can start before its
   * provider list is known. Rejected promises surface through `config-error`.
   */
  loadManifest?: () => Promise<QueryBuilderManifest | unknown>
  /**
   * The host's provider adapter. When present, submitting the form routes the
   * collected params through it; when absent the form only ever emits. The
   * adapter is normally backed by a server-side bridge that holds the
   * credential — the form never reaches a provider itself.
   */
  adapter?: LegalSearchAdapter
  /** Provider selected on mount. Falls back to the manifest's default. */
  initialProvider?: string
  /** Database selected on mount. Falls back to the provider's default. */
  initialDatabase?: string
  /**
   * Custom field components, keyed by `FieldDescriptor.block`, looked up before
   * the built-in blocks. Reserved for the runtime renderer (see the plan).
   */
  fieldComponents?: Record<string, Component>
  /**
   * Custom result views, keyed by `ResultViewRef.kind`, looked up before the
   * built-in views. Reserved for the runtime renderer (see the plan).
   */
  resultViews?: Record<string, Component>
}
