// Pure helpers for the declarative dataset field schema. Kept free of Vue so
// the collection/validation behaviour is unit-testable without mounting.

import type { DatasetDescriptor, FieldDescriptor } from 'legal-retrieval-types'

/** Whether a collected value counts as filled. */
export function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return value
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(isFieldFilled)
  }
  return false
}

/**
 * Whether a dataset declares a field schema. A dataset without `fields` falls
 * back to the built-in case-law collection path.
 */
export function hasDeclaredFields(dataset: DatasetDescriptor | undefined): boolean {
  return !!dataset?.fields && dataset.fields.length > 0
}

/**
 * The params a dataset's declared fields collected. Fields with no value are
 * omitted; a field with `includeInParams: false` is never emitted.
 */
export function collectDatasetParams(
  dataset: DatasetDescriptor,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const field of dataset.fields ?? []) {
    if (field.includeInParams === false) continue
    const value = values[field.key]
    if (!isFieldFilled(value)) continue
    params[field.key] = value
  }
  return params
}

/** Whether every `required` field has a value. */
export function validateDatasetFields(
  dataset: DatasetDescriptor,
  values: Record<string, unknown>,
): boolean {
  return (dataset.fields ?? [])
    .filter((field: FieldDescriptor) => field.required)
    .every((field: FieldDescriptor) => isFieldFilled(values[field.key]))
}
