<template>
    <section class="document-panel" aria-live="polite">
        <header class="document-head">
            <h3 class="document-title">{{ document.title || document.sourceId }}</h3>
            <button type="button" class="document-close" aria-label="Close document" @click="emit('close')">
                ×
            </button>
        </header>

        <p v-if="document.textUnavailable" class="document-note" role="status">
            The full text is not available for this document. The metadata below is all the provider has.
        </p>
        <p v-else-if="document.textTruncated" class="document-note" role="status">
            The text below is truncated<template v-if="document.fullTextSize"> ({{ document.fullTextSize.toLocaleString() }} characters in full)</template>.
        </p>

        <dl class="document-facts">
            <div v-for="fact in facts" :key="fact.label" class="document-fact">
                <dt>{{ fact.label }}</dt>
                <dd>
                    <a v-if="fact.href" :href="fact.href" target="_blank" rel="noopener noreferrer">{{ fact.value }}</a>
                    <span v-else>{{ fact.value }}</span>
                </dd>
            </div>
        </dl>

        <pre v-if="document.text" class="document-text">{{ document.text }}</pre>

        <!-- Reporting is offered only because the provider advertises it. -->
        <details v-if="canReport" class="document-report">
            <summary>Report an issue with this source</summary>

            <form class="report-form" @submit.prevent="submitReport">
                <label>
                    Issue
                    <select v-model="issueType">
                        <option value="unavailable">Unavailable</option>
                        <option value="indexing">Indexing</option>
                        <option value="invalid_url">Invalid link</option>
                        <option value="data_quality">Data quality</option>
                        <option value="other">Other</option>
                    </select>
                </label>

                <label>
                    Details
                    <textarea v-model="description" rows="3" placeholder="What is wrong?"></textarea>
                </label>

                <p class="report-confirm">
                    This is sent to the provider against <code>{{ document.source }}</code>. It cannot be undone.
                </p>

                <div class="report-actions">
                    <button type="submit" :disabled="issue.reporting">
                        {{ confirmationStage ? 'Confirm and send' : 'Review' }}
                    </button>
                    <button v-if="confirmationStage" type="button" @click="confirmationStage = false">
                        Cancel
                    </button>
                </div>
            </form>
        </details>

        <p v-if="issue.reported" class="document-note is-ok" role="status">
            Thank you — the issue was reported.
        </p>
        <p v-if="issue.error" class="document-note is-error" role="alert">{{ issue.error.message }}</p>
    </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { NormalizedLegalDocument, SourceIssueType } from 'legal-retrieval-types'
import { useLegalSearchRuntimeContext } from './useLegalSearchRuntime'

const props = defineProps<{ document: NormalizedLegalDocument }>()
const emit = defineEmits<{ close: [] }>()

const runtime = useLegalSearchRuntimeContext()

const issueType = ref<SourceIssueType>('unavailable')
const description = ref('')

// Two steps, because a report is a write and there is no undo.
const confirmationStage = ref(false)

const canReport = computed(() => runtime?.canUse('reportSourceIssue') ?? false)

const issue = computed(() => runtime?.issue ?? { reporting: false, reported: false, error: undefined })

const facts = computed(() => {
  const document = props.document
  const metadata = document.metadata ?? {}
  const entries: { label: string; value: string; href?: string }[] = [
    { label: 'Source', value: document.source },
    { label: 'Document', value: document.sourceId },
    { label: 'Date', value: document.date },
    { label: 'Country', value: document.country },
    { label: 'Language', value: document.language },
    { label: 'Court', value: asText(metadata.court) },
    { label: 'ECLI', value: asText(metadata.ecli) },
    { label: 'Case', value: asText(metadata.caseNumber) },
  ].filter((entry): entry is { label: string; value: string } => typeof entry.value === 'string' && entry.value !== '')

  if (document.url) entries.push({ label: 'Official text', value: document.url, href: document.url })
  return entries
})

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

async function submitReport() {
  const context = runtime
  if (!context) return
  if (!confirmationStage.value) {
    confirmationStage.value = true
    return
  }

  try {
    await context.reportSourceIssue({
      source: props.document.source,
      issueType: issueType.value,
      description: description.value.trim() || undefined,
    })
    confirmationStage.value = false
    description.value = ''
  } catch {
    // The runtime holds the error; it is rendered above.
  }
}
</script>

<style scoped>
.document-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    margin-top: 16px;
}

.document-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.document-title {
    margin: 0;
    font-size: 15px;
    color: #1f2937;
}

.document-close {
    border: none;
    background: none;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    color: #6b7280;
}

.document-note {
    margin: 0;
    font-size: 13px;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 8px 10px;
}

.document-note.is-ok {
    color: #166534;
    background: #f0fdf4;
    border-color: #bbf7d0;
}

.document-note.is-error {
    color: #dc2626;
    background: #fef2f2;
    border-color: #fecaca;
}

.document-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin: 0;
}

.document-fact {
    display: flex;
    gap: 6px;
    font-size: 12px;
}

.document-fact dt {
    color: #9ca3af;
}

.document-fact dd {
    margin: 0;
    color: #4b5563;
}

.document-text {
    margin: 0;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    max-height: 420px;
    overflow: auto;
}

.document-report summary {
    cursor: pointer;
    font-size: 13px;
    color: #374151;
}

.report-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
}

.report-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #374151;
}

.report-form select,
.report-form textarea {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
}

.report-confirm {
    margin: 0;
    font-size: 12px;
    color: #92400e;
}

.report-actions {
    display: flex;
    gap: 8px;
}

.report-actions button {
    padding: 6px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
}

.report-actions button[type='submit'] {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #fff;
}

.report-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
