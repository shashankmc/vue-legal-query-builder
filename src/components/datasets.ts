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
