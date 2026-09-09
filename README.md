# vue-legal-query-builder

A Vue 3 component library for building legal document search queries. Provides two flexible form modes: **FreeForm** for simple searches and **GuidedForm** for guided, multi-step workflows.

## Installation

```bash
npm install vue-legal-query-builder
```

## Quick Start

```vue
<template>
  <LegalDocsForm
    :on-search-laws="handleSearchLaws" 
    title="Search Legal Documents"
    type="free"
    @submit="handleSubmit"
    @success="handleSuccess"
    @error="handleError"
  />
</template>

<script setup>
import { LegalDocsForm } from 'vue-legal-query-builder'
import 'vue-legal-query-builder/style.css'

// This package never calls the API. Both of these go to your own server,
// which holds the credential. See "API access" below.
const handleSubmit = async (query) => {
  // `query` is a discriminated union: { dataset: 'RS', params } | { dataset: 'ECHR', params }
  const res = await fetch('/api/legal-docs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })
  return res.json()
}

const handleSearchLaws = async (text) => {
  const res = await fetch(`/api/legal-docs/laws?q=${encodeURIComponent(text)}`)
  return res.json()
}

const handleSuccess = (data) => {
  console.log('Search successful:', data)
}

const handleError = (error) => {
  console.error('Search error:', error)
}
</script>
```

## API access

**This package never calls the API.** It builds a query and hands it back to
you; you make the request from your own server.

That is not a limitation, it is the point. Calling the API needs a token, and a
token in a page is readable by anyone using it — and usable by them to make
whatever calls they like on your quota. No amount of hiding changes that, so
this package has no client, imports no HTTP library, and exports no way to
construct one.

```
browser ──▶ your server ──▶ Case Law Explorer API
             (holds the token)
```

On the server, use [`node-legal-docs-client`](../node-legal-docs-client) for
TypeScript or [`go-legal-docs-client`](../go-legal-docs-client) for Go. Tokens
are generated at
https://api.caselawexplorer.tech/login.html?next=/account.html

### The two callbacks

| Prop | Called when | You should |
|---|---|---|
| `onSubmit` | the user runs the search | POST the query to your server |
| `onSearchLaws` | the user types in the law selector | GET matching laws from your server |

`onSearchLaws` is optional. Without it the law selector tells the user that
search is unavailable, rather than spinning forever or silently finding
nothing.

```vue
<LegalDocsForm
  :on-submit="handleSubmit"
  :on-search-laws="handleSearchLaws"
/>
```

### Types

Request and response shapes come from
[`legal-docs-types`](../legal-docs-types) and are re-exported here. That
package has no client either, so it is safe to import anywhere.

## Datasets

The dataset selector supports **Rechtspraak** (Dutch case law) and **ECHR** (European Court of Human Rights); each produces its own query parameter shape (`RechtspraakQueryParameters` / `EchrQueryParameters`) reflected in the `dataset` discriminant of the submitted `LegalDocsQuery`. **CJEU** is shown as a disabled placeholder — `legal-docs-client` has no backing endpoint for it yet.

## Form Types

### FreeForm
A simple, flat form with all search options available at once. Users can fill in any combination of fields and search immediately.

**Best for:**
- Quick, flexible searches
- Expert users who know what they're looking for
- Minimal user guidance needed

**Example:**
```vue
<LegalDocsForm 
  type="free"
  title="Search Legal Documents"
  subtitle="Enter your search criteria below"
  @submit="handleSubmit"
/>
```

### GuidedForm
A structured, step-by-step workflow organized into "goals" and "steps". Users are guided through a multi-step process tailored to their search needs.

**Best for:**
- Guided workflows with specific search approaches
- Complex searches with multiple phases
- Users who benefit from structured guidance

The structure can be written by hand, as below, or taken from one of the
[built-in templates](#built-in-templates) — which is what guided mode falls back
to when no structure is passed.

**Example:**
```vue
<template>
  <LegalDocsForm 
    type="guided"
    title="Legal Case Search"
    subtitle="Choose your search approach"
    :guidedStructure="guidedStructure"
    @submit="handleSubmit"
  />
</template>

<script setup>
import { BlockType } from 'vue-legal-query-builder'

const guidedStructure = {
  goals: [
    {
      title: "Similarity Search",
      description: "Find cases comparable to your facts",
      icon: "layers",
      steps: [
        {
          title: "Facts",
          blocks: [
            {
              type: BlockType.KEYWORDS_INPUT,
              title: "Describe the facts",
              description: "Describe the factual situation in natural language",
              required: true,
              placeholder: "Example: An employee was dismissed after 10 years of service..."
            }
          ]
        },
        {
          title: "Laws",
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: "Legal provisions",
              description: "Adding legal provisions improves results",
              placeholder: "e.g., Art. 7:669 BW, Art. 7:671b BW"
            }
          ]
        },
        {
          title: "Period",
          blocks: [
            {
              type: BlockType.DATE_RANGE,
              title: "Date range",
              description: "The range determines which time period will be included"
            }
          ]
        }
      ]
    },
    {
      title: "Authority Search",
      description: "Find highly cited cases",
      icon: "scale",
      steps: [
        {
          title: "Legal Provisions",
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: "Legal provisions",
              required: true,
              placeholder: "e.g., Art. 6:162 BW"
            },
            {
              type: BlockType.KEYWORDS_INPUT,
              title: "Or keywords",
              required: true,
              placeholder: "e.g., onrechtmatige daad"
            }
          ]
        }
      ]
    }
  ]
}
</script>
```

## Built-in templates

Guided mode does not need a hand-written structure. The package ships a set of
guided structures, and guided mode falls back to the default one when neither
`guidedStructure` nor `guidedTemplate` is given:

```vue
<!-- renders the default template -->
<LegalDocsForm type="guided" @submit="handleSubmit" />

<!-- or name one explicitly -->
<LegalDocsForm type="guided" guidedTemplate="caselaw-search" @submit="handleSubmit" />
```

| Id | Name | Contents |
|----|------|----------|
| `caselaw-search` | Case law search | Similarity, authority and traditional keyword search over case law |

A host that wants to let its own users pick can list the templates:

```ts
import { guidedTemplates, DEFAULT_GUIDED_TEMPLATE_ID } from 'vue-legal-query-builder'

guidedTemplates.map((template) => ({
  id: template.id,          // 'caselaw-search'
  name: template.name,      // 'Case law search'
  description: template.description,
  goals: template.structure.goals.length,
}))
```

Also exported:

| Export | Description |
|--------|-------------|
| `guidedTemplates` | Every template the package ships, as `GuidedTemplate[]` |
| `DEFAULT_GUIDED_TEMPLATE_ID` | Id used when guided mode gets neither a structure nor a template |
| `getGuidedTemplate(id)` | One template by id, or `undefined` |
| `resolveGuidedStructure(structure?, templateId?)` | The structure the form would render: explicit structure, then template, then default |
| `caselawSearch` | The `caselaw-search` structure on its own, to start a variation from |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | 'free' \| 'guided' | 'free' | Form type (FreeForm or GuidedForm) |
| `title` | string | undefined | Form title (optional) |
| `subtitle` | string | undefined | Form subtitle (optional) |
| `guidedStructure` | GuidedStructure | undefined | Structure to render in guided mode. Takes precedence over `guidedTemplate` |
| `guidedTemplate` | GuidedTemplateId | undefined | Id of a [built-in template](#built-in-templates), used when no `guidedStructure` is given |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@submit` | LegalDocsQuery | Emitted when form is submitted and data is valid. `LegalDocsQuery` is `{ dataset: 'RS', params: RechtspraakQueryParameters } \| { dataset: 'ECHR', params: EchrQueryParameters }` |
| `@success` | any | Emitted when search completes successfully |
| `@error` | Error | Emitted when an error occurs |

## Form-Specific Behaviors

### Validation
- **FreeForm**: At least one of Keywords, ECLIs, or Selected Laws must be provided
- **GuidedForm**: For each step, at least one required block must be filled (validation applies only to the current goal being submitted)

### Warning Display
- If validation fails on submit attempt, a yellow warning message appears prompting the user to fill in required fields
- Users can retry after filling in the necessary fields

## Available Block Types

- `KEYWORDS_INPUT` - Comma-separated keyword input
- `ECLIS_INPUT` - ECLI code input
- `SELECTED_LAWS` - Search and select laws with autocomplete
- `INSTANCES_SELECTOR` - Select court instances
- `DOMAINS_SELECTOR` - Select legal domains
- `DOC_TYPE_SELECTOR` - Select decision/opinion types
- `DATE_RANGE` - Start and end date selection
- `ARTICLE_FIELD` - Article number input with AND/OR toggle
- `NETWORK_DEGREES` - Network degree configuration
- `TEXT_INPUT` - Generic text input
- `TEXTAREA_INPUT` - Multi-line text input
- `IMPORTANCE_LEVEL_SELECTOR` - Case importance level selection
- `FACTS_INPUT` - Facts input for similarity search
- `REASONING_INPUT` - Reasoning input for similarity search

## GuidedForm Structure

### Goal Object Properties
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes | Goal title shown in the goal card |
| `description` | string | Yes | Goal description shown in the goal card |
| `icon` | string | No | Optional Lucide icon name (for example `scale`, `layers`) |
| `dataset` | `'RS' \| 'ECHR' \| 'CJEU'` | No | Dataset this goal queries. Applied when the goal is selected; a `DATASET_SELECTOR` block in its steps can still change it afterwards |
| `fixedParameters` | GoalFixedParameters | No | Hidden query parameters automatically merged into the submitted query when this goal is selected |
| `steps` | Step[] | Yes | Steps shown after selecting the goal |

### dataset
By default, every goal queries whichever dataset is currently selected (`'RS'` unless changed) — there's a single, form-wide dataset value, not one per goal. Set `dataset` on a goal to pin it to `'RS'` or `'ECHR'` without needing to show a `DATASET_SELECTOR` block in its steps.

```ts
{
  title: "ECHR Case Search",
  description: "Search European Court of Human Rights case law",
  dataset: "ECHR",
  steps: [
    // ...
  ],
}
```

### fixedParameters
Use `fixedParameters` when you want to enforce specific query values for a goal without exposing extra controls in the UI. `GoalFixedParameters` is the intersection of `RechtspraakQueryParameters` and `EchrQueryParameters`, so it works regardless of which dataset the goal ends up using.

- Applied only for the currently selected goal
- Merged into the final query params (`RechtspraakQueryParameters` or `EchrQueryParameters`, depending on the selected dataset) right before submit
- If a fixed key overlaps with user-entered data, the fixed value takes precedence

**Example:** force `degreesTarget: 1` for an authority-search goal.

```ts
const guidedStructure = {
  goals: [
    {
      title: "Authority Search",
      description: "Find highly cited cases",
      icon: "scale",
      fixedParameters: {
        degreesTarget: 1,
      },
      steps: [
        // ...
      ],
    },
  ],
}
```

### Step Object Properties
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | Yes | Title displayed below the step number in the stepper |
| `blocks` | Block[] | Yes | Array of blocks to display in this step |

Each step in the GuidedForm stepper displays its title below the numbered indicator, providing users with a quick overview of what each step entails.

## Requirements

- Vue 3.4 or higher

## License

MIT

