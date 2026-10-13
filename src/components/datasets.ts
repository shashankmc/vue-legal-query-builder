// Dataset resolution for the dataset-agnostic seam.
//
// Kept as plain functions (no Vue) so the behaviour is unit-testable without
// mounting a component. See docs/dataset-agnostic-seam.md.

import {
  BUILT_IN_DATASETS,
  type DatasetDescriptor,
} from './types'

/** The datasets the picker should offer: the host's list, or the built-ins. */
export function resolveDatasets(hostDatasets?: DatasetDescriptor[]): DatasetDescriptor[] {
  return hostDatasets ?? BUILT_IN_DATASETS
}

/**
 * The dataset selected when the form opens: the first entry the host did not
 * disable, falling back to RS when every entry is disabled (which would leave
 * the form with nothing to submit against).
 */
export function defaultDataset(datasets: DatasetDescriptor[]): string {
  return datasets.find((d) => !d.disabled)?.id ?? 'RS'
}

/** Whether a dataset id is one this package builds typed parameters for. */
export function isBuiltInDataset(id: string): boolean {
  return id === 'RS' || id === 'ECHR'
}

/**
 * A generic, app-agnostic provisions dataset. BlueLab is one host that uses it;
 * the fields describe a provision search, not a BlueLab-specific shape. Hosts
 * can spread it into their own `datasets` list or use it as a template.
 */
export const provisionsDataset: DatasetDescriptor = {
  id: 'provisions',
  label: 'Provisions',
  kind: 'provisions',
  paramsMapper: 'provisions',
  retrieval: { defaultMethod: 'bm25' },
  resultView: { kind: 'ranked-list' },
  fields: [
    {
      key: 'facts',
      block: 'FactsInput',
      label: 'Facts',
      description: 'Describe the fact pattern to match provisions against.',
      required: true,
      placeholder: 'Describe the facts…',
    },
    {
      key: 'keywords',
      block: 'KeywordsInput',
      label: 'Keywords',
      description: 'Optional keywords to narrow the provision search.',
    },
    {
      key: 'selectedLaws',
      block: 'SelectedLaws',
      label: 'Provisions',
      description: 'Restrict the search to specific provisions.',
    },
  ],
}
