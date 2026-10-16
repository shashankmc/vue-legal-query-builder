// Pure state helpers for the runtime-configured search form.
//
// No Vue and no runtime imports, so the layout, dependency, validation and
// parameter-collection behaviour is unit-testable without mounting a component.
// `useLegalSearchRuntime` layers reactivity on top of this.

import type {
  FieldControl,
  FieldDescriptor,
  LegalDatabaseDescriptor,
  LegalSearchProviderDescriptor,
} from 'legal-retrieval-types'

/** Which optional fields a user hid, and the order they put the rest in. */
export interface FieldLayout {
  /** Field keys the user hid. */
  hidden: string[]
  /** Preferred order of user-configurable field keys. */
  order: string[]
}

export const EMPTY_FIELD_LAYOUT: FieldLayout = { hidden: [], order: [] }

/** A fresh, empty layout (never shared, so callers can mutate their own). */
export function resetFieldLayout(): FieldLayout {
  return { hidden: [], order: [] }
}

/**
 * Whether a value counts as filled.
 *
 * A boolean field is filled by either boolean, so a required boolean can be
 * answered "no" — the case the older `isFieldFilled` got wrong by treating
 * `false` as empty.
 */
export function isFieldFilled(value: unknown, control?: FieldControl): boolean {
  if (control === 'boolean') return typeof value === 'boolean'
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return true
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) => isFieldFilled(entry))
  }
  return false
}

/**
 * Whether the user may show/hide and reorder a field. A required field is
 * pinned by the provider contract, so it is never user-configurable.
 */
export function isUserConfigurable(field: FieldDescriptor): boolean {
  return field.userConfigurable === true && field.required !== true
}

/** Seed values for a database's fields: declared defaults, empty lists for multi. */
export function defaultFieldValues(fields: FieldDescriptor[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue
    } else if (field.multiple === true || field.control === 'multiselect') {
      values[field.key] = []
    }
  }
  return values
}

/** The user-configurable fields, in the schema's order. */
function configurableKeys(fields: FieldDescriptor[]): string[] {
  return fields.filter(isUserConfigurable).map((field) => field.key)
}

/**
 * The fields in layout order: user-configurable fields follow `layout.order`,
 * everything else stays pinned to its schema position.
 */
export function orderFields(fields: FieldDescriptor[], layout: FieldLayout): FieldDescriptor[] {
  if (layout.order.length === 0) return fields

  const configurable = configurableKeys(fields)
  const queue: FieldDescriptor[] = []
  for (const key of layout.order) {
    if (!configurable.includes(key)) continue
    const field = fields.find((entry) => entry.key === key)
    if (field && !queue.includes(field)) queue.push(field)
  }
  for (const field of fields) {
    if (isUserConfigurable(field) && !queue.includes(field)) queue.push(field)
  }

  let cursor = 0
  return fields.map((field) => (isUserConfigurable(field) ? queue[cursor++] ?? field : field))
}

export function isFieldHidden(field: FieldDescriptor, layout: FieldLayout): boolean {
  return layout.hidden.includes(field.key)
}

/** The fields after applying the user's hidden set and order. */
export function applyLayout(fields: FieldDescriptor[], layout: FieldLayout): FieldDescriptor[] {
  return orderFields(fields, layout).filter((field) => !isFieldHidden(field, layout))
}

/** Whether each `dependencies` condition is satisfied by the current values. */
export function dependencySatisfied(
  field: FieldDescriptor,
  values: Record<string, unknown>,
): boolean {
  for (const dependency of field.dependencies ?? []) {
    const actual = values[dependency.key]
    const operator = dependency.operator ?? 'truthy'

    switch (operator) {
      case 'truthy':
        if (!isFieldFilled(actual)) return false
        break
      case 'empty':
        if (isFieldFilled(actual)) return false
        break
      case 'equals':
        if (actual !== dependency.value) return false
        break
      case 'not-equals':
        if (actual === dependency.value) return false
        break
      case 'includes': {
        const list = Array.isArray(actual) ? actual : typeof actual === 'string' ? [actual] : []
        if (!list.includes(dependency.value as never)) return false
        break
      }
      default:
        // An operator this build does not know cannot be evaluated, so it does
        // not gate the field.
        break
    }
  }
  return true
}

/** The fields the form should render: layout applied, dependencies satisfied. */
export function resolveVisibleFields(
  fields: FieldDescriptor[],
  layout: FieldLayout,
  values: Record<string, unknown>,
): FieldDescriptor[] {
  return applyLayout(fields, layout).filter((field) => dependencySatisfied(field, values))
}

/** Show or hide an optional field. A required or unknown field is left alone. */
export function setFieldVisible(
  fields: FieldDescriptor[],
  layout: FieldLayout,
  key: string,
  visible: boolean,
): FieldLayout {
  const field = fields.find((entry) => entry.key === key)
  if (!field || !isUserConfigurable(field)) return layout

  const hidden = new Set(layout.hidden)
  if (visible) hidden.delete(key)
  else hidden.add(key)
  return { hidden: [...hidden], order: [...layout.order] }
}

/**
 * Move a configurable field `delta` places among the configurable fields,
 * leaving non-configurable fields where the schema put them.
 */
export function moveField(
  fields: FieldDescriptor[],
  layout: FieldLayout,
  key: string,
  delta: number,
): FieldLayout {
  const configurable = configurableKeys(fields)
  if (!configurable.includes(key)) return layout

  const order = layout.order.length
    ? [
        ...layout.order.filter((entry) => configurable.includes(entry)),
        ...configurable.filter((entry) => !layout.order.includes(entry)),
      ]
    : [...configurable]

  const index = order.indexOf(key)
  const target = index + delta
  if (target < 0 || target >= order.length) return layout

  ;[order[index], order[target]] = [order[target], order[index]]
  return { hidden: [...layout.hidden], order }
}

export interface FieldValidation {
  valid: boolean
  /** Keys of required, unsatisfied fields. */
  missing: string[]
  /** Keyed messages for bounds and option errors. */
  errors: Record<string, string>
}

/**
 * Validates the dependency-visible fields: required values plus numeric bounds
 * and option membership.
 */
export function validateFields(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
): FieldValidation {
  const missing: string[] = []
  const errors: Record<string, string> = {}

  for (const field of fields) {
    if (!dependencySatisfied(field, values)) continue

    const value = values[field.key]

    if (field.required === true && !isFieldFilled(value, field.control)) {
      missing.push(field.key)
      errors[field.key] = 'This field is required.'
      continue
    }

    if (typeof value === 'number') {
      if (field.min !== undefined && value < field.min) {
        errors[field.key] = `Must be at least ${field.min}.`
      } else if (field.max !== undefined && value > field.max) {
        errors[field.key] = `Must be at most ${field.max}.`
      }
    }

    if (field.options && field.options.length > 0 && isFieldFilled(value, field.control)) {
      const allowed = new Set(field.options.map((option) => option.value))
      const selected = Array.isArray(value) ? value : [value]
      for (const entry of selected) {
        if (typeof entry === 'string' && !allowed.has(entry)) {
          errors[field.key] = 'Not an allowed value.'
          break
        }
      }
    }
  }

  return { valid: missing.length === 0 && Object.keys(errors).length === 0, missing, errors }
}

/**
 * The params a database's fields collected: declared, dependency-visible, filled
 * and not opted out of the payload.
 */
export function collectParams(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.includeInParams === false) continue
    if (!dependencySatisfied(field, values)) continue
    const value = values[field.key]
    if (!isFieldFilled(value, field.control)) continue
    params[field.key] = value
  }
  return params
}

/** The databases a provider exposes. */
export function databasesForProvider(
  databases: LegalDatabaseDescriptor[],
  providerId: string | undefined,
): LegalDatabaseDescriptor[] {
  if (!providerId) return []
  return databases.filter((database) => database.provider === providerId)
}

/** The provider a database belongs to, if the manifest still lists it. */
export function providerForDatabase(
  providers: LegalSearchProviderDescriptor[],
  databases: LegalDatabaseDescriptor[],
  databaseId: string | undefined,
): LegalSearchProviderDescriptor | undefined {
  if (!databaseId) return undefined
  const database = databases.find((entry) => entry.id === databaseId)
  if (!database) return undefined
  return providers.find((provider) => provider.id === database.provider)
}

/**
 * The database a provider should activate: its declared default when it is
 * enabled, otherwise the first enabled database it exposes.
 */
export function defaultDatabaseForProvider(
  providers: LegalSearchProviderDescriptor[],
  databases: LegalDatabaseDescriptor[],
  providerId: string | undefined,
): string | undefined {
  const provider = providers.find((entry) => entry.id === providerId)
  if (!provider) return undefined

  const candidates = databasesForProvider(databases, provider.id)
  if (provider.defaultDatabase) {
    const declared = candidates.find(
      (database) => database.id === provider.defaultDatabase && !database.disabled,
    )
    if (declared) return declared.id
  }
  return candidates.find((database) => !database.disabled)?.id
}

/** The provider a form should open on: the declared default, else the first enabled. */
export function defaultProviderFor(
  providers: LegalSearchProviderDescriptor[],
): string | undefined {
  return providers.find((provider) => !provider.disabled)?.id ?? providers[0]?.id
}
