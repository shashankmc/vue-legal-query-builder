// Turning whatever came back from a search into something a view can render.
//
// Kept pure and Vue-free so it is unit-testable, and shared by the built-in
// views and by any host view that wants the same shape. A result may be a
// normalized provider result, a bare array of hits, or an older provisions-style
// `{ documents: [...] }` — all three are read.

import type { NormalizedSearchResult } from 'legal-retrieval-types'

/** One result, flattened for display. */
export interface ResultEntry {
  id: string
  /** 1-based position in the result set. */
  position: number
  title: string
  snippet?: string
  score?: number
  source?: string
  sourceId?: string
  url?: string
  date?: string
  country?: string
  language?: string
  /** Source-specific fields, lifted out of `metadata` where they live. */
  court?: string
  ecli?: string
  caseNumber?: string
  jurisdiction?: string
  /** Provisions-style extra, kept for the retriever's own results. */
  topProvision?: string
  raw: unknown
}

/** A result set, flattened, plus what a view needs to say about it. */
export interface ResultEntries {
  entries: ResultEntry[]
  /** How many the provider says exist, when it says. */
  total?: number
  /** The provider's own partial-result warnings. */
  warnings: string[]
  /** True when the provider reported the set was truncated. */
  partial: boolean
  /** Cursor for the next page, when the provider offered one. */
  nextCursor?: string
  elapsedMs?: number
  /** True when nothing matched. */
  empty: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** The raw entries a result contains, however it was shaped. */
function rawEntries(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  if (!isRecord(result)) return []

  if (Array.isArray(result.hits)) return result.hits
  if (Array.isArray(result.documents)) return result.documents
  if (Array.isArray(result.nodes)) return result.nodes
  if (Array.isArray(result.results)) return result.results
  return []
}

function toEntry(raw: unknown, index: number): ResultEntry {
  const entry = isRecord(raw) ? raw : {}
  const metadata = isRecord(entry.metadata) ? entry.metadata : {}

  const source = text(entry.source)
  const sourceId = text(entry.sourceId) ?? text(entry.source_id)

  return {
    id: text(entry.id) ?? (source ? `${source}/${sourceId ?? index}` : undefined) ?? String(index),
    position: index + 1,
    title: text(entry.title) ?? sourceId ?? '',
    snippet: text(entry.snippet),
    score: number(entry.score),
    source,
    sourceId,
    url: text(entry.url),
    date: text(entry.date),
    country: text(entry.country),
    language: text(entry.language),
    // Provider fields live in metadata on a normalized hit, but an older or
    // custom result may carry them at the top level. Read either.
    court: text(metadata.court) ?? text(entry.court),
    ecli: text(metadata.ecli) ?? text(entry.ecli),
    caseNumber: text(metadata.caseNumber) ?? text(entry.case_number),
    jurisdiction: text(metadata.jurisdiction) ?? text(entry.jurisdiction),
    topProvision: text(entry.top_provision),
    raw,
  }
}

/**
 * Flattens a result into entries plus the notes a view should show. Never
 * throws: an unrecognized shape is simply empty.
 */
export function toResultEntries(result: unknown): ResultEntries {
  const entries = rawEntries(result).map(toEntry)
  const record = isRecord(result) ? result : {}

  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((warning): warning is string => typeof warning === 'string')
    : []

  const total = number(record.totalHits) ?? number(record.total_hits) ?? number(record.total)
  const nextCursor = text(record.nextCursor) ?? text(record.next_cursor)

  return {
    entries,
    total: total ?? (entries.length > 0 ? entries.length : undefined),
    warnings,
    partial: record.partial === true,
    nextCursor,
    elapsedMs: number(record.elapsedMs) ?? number(record.elapsed_ms),
    empty: entries.length === 0,
  }
}

/** Whether a result is already a normalized provider result. */
export function isNormalizedSearchResult(result: unknown): result is NormalizedSearchResult {
  return isRecord(result) && Array.isArray(result.hits)
}

/** The width, as a percentage, a score bar should fill. */
export function scorePercent(score: number): number {
  return Math.max(0, Math.min(100, score * 100))
}

/** How a score is shown. */
export function formatScore(score: number | undefined): string {
  return score !== undefined && Number.isFinite(score) ? score.toFixed(3) : '-'
}
