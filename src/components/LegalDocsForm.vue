<template>
    <div class="legal-docs-form">
        <h2 v-if="props.title" class="title">{{ props.title }}</h2>
        <p v-if="props.subtitle" class="subtitle">{{ props.subtitle }}</p>
        <FreeForm 
            v-if="props.type === FormType.FREE"
            :formData="formData"
            :loading="loading"
            @submit="handleSubmit"
            @handleReset="handleReset"
        />
        <GuidedForm 
            v-else-if="props.type === FormType.GUIDED"
            :guidedStructure="guidedStructure"
            :formData="formData"
            :loading="loading"
            @submit="handleSubmit"
            @handleReset="handleReset"
        />

        <!-- Success Message -->
        <div v-if="successMessage" class="success-message">
            {{ successMessage }}
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
            {{ error }}
        </div>

        <!-- Warning Message -->
        <div v-if="!loading && !successMessage && hasValidationWarning" class="warning-message">
            Please enter at least one of the required <strong>*</strong> fields.
        </div>

        <!-- Loader -->
        <div v-if="loading" class="loader-container">
            <div class="spinner"></div>
            <p class="loader-text">Searching documents...</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, provide } from 'vue'
import { DocType } from 'legal-docs-types'
import type {
    RechtspraakQueryParameters,
    EchrQueryParameters,
    RechtspraakEdgeSource,
    OpendataStatusFilter,
    EchrDocumentType,
    AttributesToFetch,
} from 'legal-docs-types'
import type { LegalDocsFormProps, Dataset, LegalDocsQuery, GoalFixedParameters, DatasetDescriptor } from './types'
import { FormType } from './types'
import { defaultDataset, isBuiltInDataset, resolveDatasets } from './datasets'
import { provideHostCallbacks } from './hostCallbacks'
import { resolveGuidedStructure } from '../templates'
import FreeForm from './forms/FreeForm.vue'
import GuidedForm from './forms/GuidedForm.vue'

const props = withDefaults(defineProps<LegalDocsFormProps>(), {
    type: FormType.FREE
})

// Blocks that look things up while the form is being filled in ask the host to
// do it, so no part of this package ever calls the API or holds a credential.
provideHostCallbacks({ searchLaws: (query) => props.onSearchLaws?.(query) ?? Promise.resolve([]) })

// Datasets the picker offers. A host supplies its own list to plug in a corpus
// this package does not know about; otherwise the built-ins apply. See
// docs/dataset-agnostic-seam.md.
const datasets = computed<DatasetDescriptor[]>(() => resolveDatasets(props.datasets))

// An explicit structure wins, then a named template, then the default template —
// so asking for guided mode alone is enough to get a usable form.
const guidedStructure = computed(() => resolveGuidedStructure(props.guidedStructure, props.guidedTemplate))
provide('legal-docs-form-datasets', datasets)

const emit = defineEmits<{
    submit: [data: LegalDocsQuery]
    success: [result: any]
    error: [error: Error]
}>()

// Form data
const formData = reactive({
    selectedDataset: defaultDataset(datasets.value) as Dataset,
    keywords: [] as string[],
    eclis: '',
    articles: '',
    selectedLaws: [] as string[],
    selectedLawsIntersect: true,
    selectedInstances: [] as string[],
    selectedDomains: [] as string[],
    degreesSource: 0,
    degreesTarget: 0,
    dateStart: '1900-01-01',
    dateEnd: new Date().toISOString().split('T')[0],
    decisions: true,
    opinions: false,
    attributesToFetch: 'ALL' as AttributesToFetch,
    // Similarity Search fields. Not part of the published RechtspraakQueryParameters/EchrQueryParameters
    // types, but still merged into the submitted params as a best-effort passthrough.
    facts: '',
    reasoning: '',
    guidedFixedParameters: {} as GoalFixedParameters,

    // Rechtspraak-specific advanced fields (comma-separated raw inputs, parsed on submit)
    procedureTypesInput: '',
    languagesInput: '',
    jurisdictionCountriesInput: '',
    zaaknummersInput: '',
    bwbResourcesInput: '',
    journalAbbrsInput: '',
    relationTypesInput: '',
    edgeSources: [] as RechtspraakEdgeSource[],
    includeDepublicated: undefined as OpendataStatusFilter | undefined,
    datePublishedStart: '',
    datePublishedEnd: '',

    // Shared pagination / result-shape fields
    onlyCaseIds: false,
    pageSize: undefined as number | undefined,
    cursor: '',

    // ECHR-specific
    articleViolatedInput: '',
    articleAppliedInput: '',
    articleNonViolatedInput: '',
    articleViolated: [] as string[],
    articleApplied: [] as string[],
    articleNonViolated: [] as string[],
    articleViolatedIntersect: false,
    articleAppliedIntersect: false,
    articleNonViolatedIntersect: false,
    articleGlobalIntersect: false,
    applicationNumber: '',
    respondentStateInput: '',
    languageInput: '',
    importance: undefined as number | undefined,
    echrDocTypes: [] as EchrDocumentType[],
    dateJudgmentStart: '',
    dateJudgmentEnd: '',
    dateDecisionStart: '',
    dateDecisionEnd: ''
})

const loading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const hasValidationWarning = ref(false)

const parseList = (input: string): string[] | undefined => {
    const items = input.split(',').map(i => i.trim()).filter(i => i.length > 0)
    return items.length > 0 ? items : undefined
}

function parseRechtspraakParams(): RechtspraakQueryParameters {
    const docTypes: DocType[] = []
    if (formData.decisions) docTypes.push(DocType.DEC)
    if (formData.opinions) docTypes.push(DocType.OPI)

    const params: RechtspraakQueryParameters = {
        degreesSource: formData.degreesSource,
        degreesTarget: formData.degreesTarget,
        dateStart: formData.dateStart,
        dateEnd: formData.dateEnd,
        docTypes,
        attributesToFetch: formData.attributesToFetch
    }

    const eclis = parseList(formData.eclis)
    if (eclis) params.eclis = eclis

    if (formData.keywords.length > 0) params.keywords = formData.keywords
    if (formData.articles) params.articles = formData.articles
    if (formData.selectedLaws.length > 0) params.selectedLaws = formData.selectedLaws
    if (formData.selectedLawsIntersect !== undefined) params.selectedLawsIntersect = formData.selectedLawsIntersect
    if (formData.selectedInstances.length > 0) params.instances = formData.selectedInstances
    if (formData.selectedDomains.length > 0) params.domains = formData.selectedDomains

    const procedureTypes = parseList(formData.procedureTypesInput)
    if (procedureTypes) params.procedureTypes = procedureTypes

    const languages = parseList(formData.languagesInput)
    if (languages) params.languages = languages

    const jurisdictionCountries = parseList(formData.jurisdictionCountriesInput)
    if (jurisdictionCountries) params.jurisdictionCountries = jurisdictionCountries

    const zaaknummers = parseList(formData.zaaknummersInput)
    if (zaaknummers) params.zaaknummers = zaaknummers

    const bwbResources = parseList(formData.bwbResourcesInput)
    if (bwbResources) params.bwbResources = bwbResources

    const journalAbbrs = parseList(formData.journalAbbrsInput)
    if (journalAbbrs) params.journalAbbrs = journalAbbrs

    const relationTypes = parseList(formData.relationTypesInput)
    if (relationTypes) params.relationTypes = relationTypes

    if (formData.edgeSources.length > 0) params.edgeSources = formData.edgeSources
    if (formData.includeDepublicated) params.includeDepublicated = formData.includeDepublicated
    if (formData.datePublishedStart) params.datePublishedStart = formData.datePublishedStart
    if (formData.datePublishedEnd) params.datePublishedEnd = formData.datePublishedEnd

    if (formData.onlyCaseIds) params.onlyCaseIds = formData.onlyCaseIds
    if (formData.pageSize) params.pageSize = formData.pageSize
    if (formData.cursor) params.cursor = formData.cursor

    return params
}

function parseEchrParams(): EchrQueryParameters {
    const params: EchrQueryParameters = {
        degreesSource: formData.degreesSource,
        degreesTarget: formData.degreesTarget,
        attributesToFetch: formData.attributesToFetch
    }

    const ecli = parseList(formData.eclis)
    if (ecli) params.ecli = ecli

    if (formData.keywords.length > 0) params.keywords = formData.keywords

    if (formData.articleViolated.length > 0) {
        params.article_violated = formData.articleViolated
        params.article_violated_mode = formData.articleViolatedIntersect ? 'AND' : 'OR'
    } else if (formData.articleViolatedInput) {
        params.article_violated = parseList(formData.articleViolatedInput)
        params.article_violated_mode = formData.articleViolatedIntersect ? 'AND' : 'OR'
    }
    if (formData.articleApplied.length > 0) {
        params.article_applied = formData.articleApplied
        params.article_applied_mode = formData.articleAppliedIntersect ? 'AND' : 'OR'
    } else if (formData.articleAppliedInput) {
        params.article_applied = parseList(formData.articleAppliedInput)
        params.article_applied_mode = formData.articleAppliedIntersect ? 'AND' : 'OR'
    }
    if (formData.articleNonViolated.length > 0) {
        params.article_non_violated = formData.articleNonViolated
        params.article_non_violated_mode = formData.articleNonViolatedIntersect ? 'AND' : 'OR'
    } else if (formData.articleNonViolatedInput) {
        params.article_non_violated = parseList(formData.articleNonViolatedInput)
        params.article_non_violated_mode = formData.articleNonViolatedIntersect ? 'AND' : 'OR'
    }
    params.articles_mode = formData.articleGlobalIntersect ? 'AND' : 'OR'

    const applicationNumbers = parseList(formData.applicationNumber)
    if (applicationNumbers) params.application_number = applicationNumbers

    const respondentStates = parseList(formData.respondentStateInput)
    if (respondentStates) params.respondent_state = respondentStates

    const languages = parseList(formData.languageInput)
    if (languages) params.language = languages

    if (formData.importance !== undefined) params.importance = formData.importance
    if (formData.echrDocTypes.length > 0) params.document_type = formData.echrDocTypes

    if (formData.dateJudgmentStart) params.date_judgment_start = formData.dateJudgmentStart
    if (formData.dateJudgmentEnd) params.date_judgment_end = formData.dateJudgmentEnd
    if (formData.dateDecisionStart) params.date_decision_start = formData.dateDecisionStart
    if (formData.dateDecisionEnd) params.date_decision_end = formData.dateDecisionEnd

    if (formData.onlyCaseIds) params.onlyCaseIds = formData.onlyCaseIds
    if (formData.pageSize) params.pageSize = formData.pageSize
    if (formData.cursor) params.cursor = formData.cursor

    return params
}

function parseParameters(): LegalDocsQuery {
    // facts/reasoning aren't declared on either query type in legal-docs-types, but are merged
    // in anyway as a best-effort passthrough in case the API still accepts them.
    const passthrough: Record<string, string> = {}
    if (formData.facts) passthrough.facts = formData.facts
    if (formData.reasoning) passthrough.reasoning = formData.reasoning

    // A host-registered dataset gets its collected fields back as a plain
    // object under its own id; the host's onSubmit translates them. See
    // docs/dataset-agnostic-seam.md.
    if (!isBuiltInDataset(formData.selectedDataset)) {
        return {
            dataset: formData.selectedDataset,
            params: { ...parseRechtspraakParams(), ...passthrough, ...formData.guidedFixedParameters },
        }
    }

    if (formData.selectedDataset === 'ECHR') {
        return {
            dataset: 'ECHR',
            params: { ...parseEchrParams(), ...passthrough, ...formData.guidedFixedParameters } as EchrQueryParameters
        }
    }

    return {
        dataset: 'RS',
        params: { ...parseRechtspraakParams(), ...passthrough, ...formData.guidedFixedParameters } as RechtspraakQueryParameters
    }
}

const handleSubmit = async (isValid: boolean) => {
    // Clear previous messages
    error.value = null
    successMessage.value = null
    hasValidationWarning.value = !isValid

    // If validation failed, don't proceed
    if (!isValid) {
        return
    }

    loading.value = true

    try {
        const params = parseParameters()
        emit('submit', params)

        if (props.onSubmit) {
            const data = await props.onSubmit(params)

            // Check if data contains nodes (for network response)
            let docCount = 0
            if (data && typeof data === 'object') {
                if (Array.isArray(data.nodes)) {
                    docCount = data.nodes.length
                } else if (Array.isArray(data)) {
                    docCount = data.length
                }
            }

            successMessage.value = `${docCount} document${docCount !== 1 ? 's' : ''} fetched`
            emit('success', data)
        }
    } catch (err: any) {
        error.value = err.message || 'An error occurred'
        emit('error', err)
    } finally {
        loading.value = false
    }
}

const handleReset = () => {
    formData.selectedDataset = 'RS'
    formData.keywords = []
    formData.eclis = ''
    formData.articles = ''
    formData.selectedLaws = []
    formData.selectedLawsIntersect = true
    formData.selectedInstances = []
    formData.selectedDomains = []
    formData.degreesSource = 0
    formData.degreesTarget = 0
    formData.dateStart = '1900-01-01'
    formData.dateEnd = new Date().toISOString().split('T')[0]
    formData.decisions = true
    formData.opinions = false
    formData.attributesToFetch = 'ALL'
    formData.facts = ''
    formData.reasoning = ''
    formData.guidedFixedParameters = {}

    formData.procedureTypesInput = ''
    formData.languagesInput = ''
    formData.jurisdictionCountriesInput = ''
    formData.zaaknummersInput = ''
    formData.bwbResourcesInput = ''
    formData.journalAbbrsInput = ''
    formData.relationTypesInput = ''
    formData.edgeSources = []
    formData.includeDepublicated = undefined
    formData.datePublishedStart = ''
    formData.datePublishedEnd = ''

    formData.onlyCaseIds = false
    formData.pageSize = undefined
    formData.cursor = ''

    formData.articleViolatedInput = ''
    formData.articleAppliedInput = ''
    formData.articleNonViolatedInput = ''
    formData.articleViolated = []
    formData.articleApplied = []
    formData.articleNonViolated = []
    formData.articleViolatedIntersect = false
    formData.articleAppliedIntersect = false
    formData.articleNonViolatedIntersect = false
    formData.articleGlobalIntersect = false
    formData.applicationNumber = ''
    formData.respondentStateInput = ''
    formData.languageInput = ''
    formData.importance = undefined
    formData.echrDocTypes = []
    formData.dateJudgmentStart = ''
    formData.dateJudgmentEnd = ''
    formData.dateDecisionStart = ''
    formData.dateDecisionEnd = ''
    clearMessages()
}

const clearMessages = () => {
    error.value = null
    successMessage.value = null
}
</script>

<style scoped>
.legal-docs-form {
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

.legal-docs-form h2 {
    margin-bottom: 24px;
    color: #2c3e50;
}

.form-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
    font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 60px;
}

/* Button Group for Dataset Selection */
.button-group {
    display: flex;
    gap: 8px;
}

.button-group button {
    flex: 1;
    padding: 10px 16px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #374151;
}

.button-group button:hover:not(:disabled) {
    background-color: #f9fafb;
    border-color: #9ca3af;
}

.button-group button.active {
    background-color: #3b82f6;
    border-color: #3b82f6;
    color: white;
}

.button-group button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Label with Toggle */
.label-with-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.intersect-toggle {
    padding: 4px 12px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: #374151;
}

.intersect-toggle:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
}

/* Form Group Row */
.form-group-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

/* Checkbox Group */
.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
}

/* Hierarchical Checkboxes */
.hierarchical-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    max-height: 400px;
    overflow-y: auto;
}

.hierarchical-checkboxes:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hierarchy-level {
    transition: background-color 0.2s;
}

.hierarchy-level .checkbox-label {
    gap: 8px;
    padding: 4px 0;
}

/* Toggle Advanced Button */
.toggle-advanced {
    padding: 10px 16px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #374151;
    text-align: left;
    width: 100%;
}

.toggle-advanced:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
}

/* Help Text */
.help-text {
    font-size: 12px;
    color: #6b7280;
    margin: 0;
}

/* Form Actions */
.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
}

.form-actions button {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.form-actions button[type="submit"] {
    background-color: #3b82f6;
    color: white;
}

.form-actions button[type="submit"]:hover:not(:disabled) {
    background-color: #2563eb;
}

.form-actions button[type="button"] {
    background-color: #f3f4f6;
    color: #374151;
}

.form-actions button[type="button"]:hover:not(:disabled) {
    background-color: #e5e7eb;
}

.form-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.success-message {
    margin-top: 16px;
    padding: 12px;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    color: #16a34a;
    font-size: 14px;
}

.error-message {
    margin-top: 16px;
    padding: 12px;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #dc2626;
    font-size: 14px;
}

/* Warning Message */
.warning-message {
    margin-top: 16px;
    padding: 12px;
    background-color: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    color: #92400e;
    font-size: 14px;
}

/* Required Asterisk */
.required-asterisk {
    color: #dc2626;
    margin-left: 2px;
}

.title {
  text-align: center;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  margin-bottom: 32px;
  font-size: 16px;
}

/* Loader */
.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 4px;
  margin-top: 16px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loader-text {
  color: #3b82f6;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

/* Responsive */
@media (max-width: 640px) {
    .form-group-row {
        grid-template-columns: 1fr;
    }

    .button-group {
        flex-direction: column;
    }
}
</style>
