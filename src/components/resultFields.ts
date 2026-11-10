// Which fields a set of results can show, and how to show them.
//
// A provider may describe every field its hits *can* carry (a catalogue, passed
// as `resultView.config.fields`), but rarely which ones a given source fills.
// So the columns are worked out from the results themselves: a catalogue field
// is offered when at least one hit has it, and a field the catalogue does not
// know is still offered under a readable label. Pure and Vue-free.

import type { ResultViewRef } from 'legal-retrieval-types'
import type { ResultEntry } from './resultEntries'

/** How a result field's value is rendered. */
export type ResultFieldType = 'text' | 'longtext' | 'date' | 'url' | 'number' | 'code'

/** One field a result can carry. */
export interface ResultFieldDescriptor {
  /** Where the value lives: a `metadata` key, or a core slot such as `date`. */
  key: string
  label: string
  type?: ResultFieldType
  /** Shown before the user picks their own columns. */
  default?: boolean
}

/** Entry slots a view renders itself, so they are never offered as columns. */
const NOT_COLUMNS = new Set(['id', 'position', 'title', 'snippet', 'score', 'url', 'sourceId', 'raw', 'metadata'])

/** Metadata flags that describe the hit rather than the document. */
const FLAGS = new Set(['textUnavailable', 'textTruncated'])

/** How many columns to show when nothing marks a default. */
const FALLBACK_COLUMN_COUNT = 4

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** The catalogue a result view was configured with, when it has one. */
export function resultFieldsFromView(view: ResultViewRef | undefined): ResultFieldDescriptor[] | undefined {
  const fields = view?.config?.fields
  if (!Array.isArray(fields)) return undefined
  return fields.filter(
    (field): field is ResultFieldDescriptor =>
      isRecord(field) && typeof field.key === 'string' && typeof field.label === 'string',
  )
}

/** A field's value on one entry: metadata first, then the entry's own slot. */
export function resultFieldValue(entry: ResultEntry, key: string): unknown {
  if (isRecord(entry.metadata) && key in entry.metadata) return entry.metadata[key]
  return (entry as unknown as Record<string, unknown>)[key]
}

/** `caseNumber` / `case_number` → `Case number`. */
export function humanizeFieldKey(key: string): string {
  const words = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The fields these entries can show: catalogue fields present in at least one
 * entry, in catalogue order, then any other present field, alphabetically.
 */
export function availableResultFields(
  entries: ResultEntry[],
  catalog: ResultFieldDescriptor[] = [],
): ResultFieldDescriptor[] {
  const present = new Set<string>()
  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry)) {
      if (!NOT_COLUMNS.has(key) && isPresent(value)) present.add(key)
    }
    if (isRecord(entry.metadata)) {
      for (const [key, value] of Object.entries(entry.metadata)) {
        if (!FLAGS.has(key) && isPresent(value)) present.add(key)
      }
    }
  }

  const known = catalog.filter((field) => present.has(field.key))
  const knownKeys = new Set(catalog.map((field) => field.key))
  const extra = [...present]
    .filter((key) => !knownKeys.has(key))
    .sort()
    .map((key): ResultFieldDescriptor => ({ key, label: humanizeFieldKey(key) }))

  return [...known, ...extra]
}

/** The columns shown before the user chooses: the defaults, or the first few. */
export function defaultResultColumns(available: ResultFieldDescriptor[]): string[] {
  const defaults = available.filter((field) => field.default).map((field) => field.key)
  return defaults.length > 0
    ? defaults
    : available.slice(0, FALLBACK_COLUMN_COUNT).map((field) => field.key)
}

/**
 * The columns to show: the user's saved choice where those fields are present,
 * in the order the user saved them, else the defaults.
 */
export function resolveResultColumns(
  available: ResultFieldDescriptor[],
  saved: string[] | null | undefined,
): string[] {
  if (!saved) return defaultResultColumns(available)
  const keys = new Set(available.map((field) => field.key))
  return saved.filter((key) => keys.has(key))
}

/** Where a column choice is remembered: per provider, corpus and source set. */
export function resultColumnsStorageKey(
  provider: string | undefined,
  database: string | undefined,
  sources: unknown,
): string {
  const list = Array.isArray(sources) ? sources.map(String).filter(Boolean).sort() : []
  return ['lqb-columns', provider ?? '-', database ?? '-', list.length > 0 ? list.join(',') : 'all'].join(':')
}

/** A value as display text. Long text is clipped; a view may show it whole. */
export function formatResultValue(value: unknown, type: ResultFieldType | undefined): string {
  if (!isPresent(value)) return ''
  if (Array.isArray(value)) return value.map((item) => formatResultValue(item, type)).join(', ')
  if (typeof value === 'number') return type === 'number' ? value.toLocaleString() : String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  if (type === 'date') return text.slice(0, 10)
  if (type === 'longtext' && text.length > 240) return `${text.slice(0, 240)}…`
  return text
}
