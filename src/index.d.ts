import type { DefineComponent, Plugin } from "vue";
import type {
  RechtspraakQueryParameters,
  RechtspraakDocument,
  RechtspraakFullTextDocument,
  EchrQueryParameters,
  EchrDocument,
  EchrFullTextDocument,
  BWBItem,
} from "legal-docs-types";
import type { DatasetDescriptor, FieldDescriptor, ResultViewRef } from "legal-retrieval-types";

export type { DatasetDescriptor, FieldDescriptor, ResultViewRef };

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

export type Dataset = "RS" | "ECHR" | "CJEU";

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
}

export declare const LegalDocsForm: DefineComponent<LegalDocsFormProps, {}, any>;


export { DocType } from "legal-docs-types";


export declare const VueLegalQueryBuilderPlugin: Plugin;

export default VueLegalQueryBuilderPlugin;
