# Design note: letting any dataset use the form without changing this package

Status: proposal, 30 September 2026.

## The problem

`vue-legal-query-builder` is built around two datasets, Rechtspraak (`RS`) and
ECHR, and one credential-backed API. Its `Dataset` type is the closed union
`'RS' | 'ECHR' | 'CJEU'`, and `LegalDocsQuery` is a union of the two parameter
shapes from `legal-docs-types`. Everything else about the package is already
host-driven:

- it never calls an API;
- `onSubmit` and `onSearchLaws` are supplied by the host;
- the guided form's fields are data (`GuidedStructure`), not code.

The gap is only at the **edges**: the dataset picker offers a fixed list, and
`@submit` hands back `{ dataset: 'RS' | 'ECHR', params }`. A project with its
own corpus — say BlueLab's provision search — can already reuse the form's
machine, but it cannot say "my dataset" without either forking or being forced
into the case-law vocabulary.

## The goal

A host should be able to plug in **its own dataset** and its own query
parameters and get the form's layout, validation and guided steps, **without
any change to this package**. This package stays dataset- and
database-agnostic; it knows about *shape*, not about *content*.

## The seam

Two small, additive, backward-compatible changes.

### 1. A host-supplied dataset descriptor

```ts
export interface DatasetDescriptor {
  /** Id returned in @submit, e.g. "RS", "ECHR", "bluelab". */
  id: string
  /** Label shown in a DatasetSelector block. */
  label: string
  /** Optional: disabled entries shown but not selectable. */
  disabled?: boolean
}
```

`LegalDocsForm` gains an optional `datasets?: DatasetDescriptor[]` prop. When it
is absent, behaviour is exactly today's: `RS`, `ECHR` and the disabled `CJEU`.
When it is present, the form uses that list, and the default selected dataset
is the first non-disabled entry.

The built-in `RS`/`ECHR` remain first-class: a host can pass
`datasets={[...builtInDatasets, { id: 'bluelab', label: 'BlueLab' }]}` to keep
them and add one.

### 2. A generic submit payload

```ts
export type LegalDocsQuery =
  | { dataset: 'RS'; params: RechtspraakQueryParameters }
  | { dataset: 'ECHR'; params: EchrQueryParameters }
  | { dataset: string; params: Record<string, unknown> }   // host-defined
```

The third member is the escape hatch. A host that registers a non-built-in
dataset gets its collected fields back as a plain `params` object under its own
`dataset` id; it is then the host's `onSubmit` that maps those onto its own
search.

The field collection itself is already generic enough: `formData` holds
`keywords`, `facts`, `reasoning`, selected laws, dates, the raw text inputs and
`guidedFixedParameters`, and any of these can be surfaced as blocks. Where a
host needs a field this package has no block for, the guided structure's
`fixedParameters` and the free-form inputs cover the common case; a genuinely
new block type is a separate, opt-in extension (below), not required for the
seam.

### 3. Optional: a host block registry (out of scope for this change)

If a host needs a field with no matching `BlockType`, the natural extension is
an optional `blocks?: Record<string, Component>` prop, looked up by `Block.type`
before the built-in switch. That keeps custom fields in the host and out of the
package. This note proposes the interface but does not implement it here; it is
listed so the design does not have to change again to admit it.

```ts
export interface LegalDocsFormProps {
  // …existing props
  datasets?: DatasetDescriptor[]
  blocks?: Record<string, Component>
}
```

## What does *not* change

- The default behaviour with no new props: identical.
- `RS`/`ECHR` payloads: unchanged, still the typed unions.
- No API calls in the package. `onSubmit`/`onSearchLaws`/custom block callbacks
  remain host-supplied, so no credential ever reaches the page.
- `legal-docs-types` stays the contract for the built-in datasets. Other
  datasets bring their own types on the host side.

## Example: BlueLab provision search

BlueLab wants its scenario's fact pattern searched against a provision corpus
with TF-IDF / BM25 / SBERT. It mounts the same form, adds its dataset, and maps
the generic payload:

```vue
<LegalDocsForm
  type="guided"
  :guided-structure="bluelabStructure"
  :datasets="[
    { id: 'RS', label: 'Rechtspraak' },
    { id: 'ECHR', label: 'ECHR' },
    { id: 'bluelab', label: 'BlueLab provisions' },
  ]"
  @submit="onSubmit"
/>
```

```ts
async function onSubmit(query: LegalDocsQuery) {
  if (query.dataset !== 'bluelab') return searchCaseLaw(query)
  // BlueLab's own service; the form never touches it directly.
  return fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: (query.params.facts as string) || (query.params.keywords as string[]).join(' '),
      method: 'bm25',
    }),
  }).then((r) => r.json())
}
```

The guided structure's blocks are ordinary `BlockType`s; the dataset id and the
`onSubmit` mapping are the only BlueLab-specific parts.

## Relationship to BlueLab's modularization plan

This is the smallest change that makes option 1 of the BlueLab plan
(`docs/MODULARIZATION_PLAN.md`) work: reuse `vue-legal-query-builder` as the
**configurable field-collection front end**, and let BlueLab's service be the
backend. It does not replace the planned sibling package
`vue-legal-provision-retriever`; that package remains the richer, BlueLab-native
retriever. This seam is what lets a host connect **any** dataset — BlueLab's or
someone else's — in the meantime, without waiting for, or changing, this
package.

## Testing

- No new props ⇒ existing snapshot of rendered datasets and `@submit` payloads
  is unchanged.
- `datasets` prop ⇒ the picker lists exactly those entries; the first enabled
  one is selected.
- A non-built-in dataset ⇒ `@submit` emits `{ dataset: '<id>', params }`.
- Built-in datasets ⇒ `@submit` still emits the typed `RS`/`ECHR` shape.
