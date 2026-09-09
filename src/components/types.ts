import type { RechtspraakQueryParameters, EchrQueryParameters, BWBItem } from 'legal-docs-types'

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

/** Dataset a query targets. CJEU has no backing endpoint in the API yet and stays disabled in the UI. */
export type Dataset = 'RS' | 'ECHR' | 'CJEU'

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

/** Discriminated union so a host app knows which client method to call with `params`. */
export type LegalDocsQuery =
  | { dataset: 'RS'; params: RechtspraakQueryParameters }
  | { dataset: 'ECHR'; params: EchrQueryParameters }

export interface LegalDocsFormProps {
  title?: string
  subtitle?: string
  type?: FormType
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
}
