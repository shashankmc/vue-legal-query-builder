import type { App, Plugin } from "vue";

// Export components
import LegalDocsForm from "./components/LegalDocsForm.vue";
export { LegalDocsForm };
export type { SearchLaws } from "./components/hostCallbacks";
export type { LegalDocsFormProps, Dataset, DatasetDescriptor, LegalDocsQuery, Goal, GoalFixedParameters, GuidedStructure, GuidedTemplate, GuidedTemplateId, Step, Block } from "./components/types";
export { BUILT_IN_DATASETS, FormType, BlockType } from "./components/types";

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
