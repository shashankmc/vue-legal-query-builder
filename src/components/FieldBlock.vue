<template>
    <div class="field-block">
        <component v-if="component" :is="component" v-bind="bindings" />
        <p v-else class="field-unsupported">Unsupported field block "{{ field.block }}".</p>
        <p v-if="field.description" class="field-description">{{ field.description }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FieldDescriptor } from 'legal-retrieval-types'
import { BlockType } from './types'

import KeywordsInput from './blocks/KeywordsInput.vue'
import EclisInput from './blocks/EclisInput.vue'
import SelectedLaws from './blocks/SelectedLaws.vue'
import InstancesSelector from './blocks/InstancesSelector.vue'
import DomainsSelector from './blocks/DomainsSelector.vue'
import ImportanceLevelSelector from './blocks/ImportanceLevelSelector.vue'
import ArticleField from './blocks/ArticleField.vue'
import FactsInput from './blocks/FactsInput.vue'
import ReasoningInput from './blocks/ReasoningInput.vue'
import TextInput from './blocks/TextInput.vue'
import TextAreaInput from './blocks/TextAreaInput.vue'
import DateRange from './blocks/DateRange.vue'
import NetworkDegrees from './blocks/NetworkDegrees.vue'
import DocTypeSelector from './blocks/DocTypeSelector.vue'

const props = defineProps<{
    field: FieldDescriptor
    modelValue?: unknown
}>()

const emit = defineEmits<{
    'update:modelValue': [value: unknown]
}>()

const set = (value: unknown) => emit('update:modelValue', value)

const normalizedBlock = computed(() => {
    const raw = props.field.block
    if ((Object.values(BlockType) as string[]).includes(raw)) return raw as BlockType
    const wanted = raw.trim().toLowerCase().replace(/[\s_-]/g, '')
    return (Object.values(BlockType) as string[]).find(
        (value) => value.toLowerCase().replace(/[\s_-]/g, '') === wanted,
    ) as BlockType | undefined
})

const component = computed(() => {
    const map: Partial<Record<BlockType, unknown>> = {
        [BlockType.KEYWORDS_INPUT]: KeywordsInput,
        [BlockType.ECLIS_INPUT]: EclisInput,
        [BlockType.SELECTED_LAWS]: SelectedLaws,
        [BlockType.INSTANCES_SELECTOR]: InstancesSelector,
        [BlockType.DOMAINS_SELECTOR]: DomainsSelector,
        [BlockType.IMPORTANCE_LEVEL_SELECTOR]: ImportanceLevelSelector,
        [BlockType.ARTICLE_FIELD]: ArticleField,
        [BlockType.FACTS_INPUT]: FactsInput,
        [BlockType.REASONING_INPUT]: ReasoningInput,
        [BlockType.TEXT_INPUT]: TextInput,
        [BlockType.TEXTAREA_INPUT]: TextAreaInput,
        [BlockType.DATE_RANGE]: DateRange,
        [BlockType.NETWORK_DEGREES]: NetworkDegrees,
        [BlockType.DOC_TYPE_SELECTOR]: DocTypeSelector,
    }
    return normalizedBlock.value ? map[normalizedBlock.value] : undefined
})

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const bindings = computed<Record<string, unknown>>(() => {
    const value = props.modelValue
    const record = asRecord(value)

    switch (normalizedBlock.value) {
        case BlockType.KEYWORDS_INPUT:
            return { keywords: (value as string[]) ?? [], 'onUpdate:keywords': set }
        case BlockType.ECLIS_INPUT:
            return { eclis: (value as string) ?? '', 'onUpdate:eclis': set }
        case BlockType.SELECTED_LAWS:
            return {
                selectedLaws: (value as string[]) ?? [],
                'onUpdate:selectedLaws': set,
                label: props.field.label,
                required: props.field.required,
            }
        case BlockType.INSTANCES_SELECTOR:
        case BlockType.DOMAINS_SELECTOR:
            return { selectedValues: (value as string[]) ?? [], 'onUpdate:selectedValues': set }
        case BlockType.IMPORTANCE_LEVEL_SELECTOR:
            return { importance: value as number | undefined, 'onUpdate:importance': set }
        case BlockType.ARTICLE_FIELD:
            return {
                fieldName: props.field.key,
                value: (value as string) ?? '',
                'onUpdate:value': set,
                isIntersect: false,
                'onUpdate:isIntersect': () => {},
                placeholder: props.field.placeholder,
            }
        case BlockType.FACTS_INPUT:
            return { facts: (value as string) ?? '', 'onUpdate:facts': set, placeholder: props.field.placeholder }
        case BlockType.REASONING_INPUT:
            return { reasoning: (value as string) ?? '', 'onUpdate:reasoning': set, placeholder: props.field.placeholder }
        case BlockType.TEXTAREA_INPUT:
            return {
                fieldId: props.field.key,
                value: (value as string) ?? '',
                'onUpdate:value': set,
                placeholder: props.field.placeholder ?? '',
            }
        case BlockType.TEXT_INPUT:
            return {
                fieldId: props.field.key,
                label: props.field.label,
                value: (value as string) ?? '',
                'onUpdate:value': set,
                placeholder: props.field.placeholder ?? '',
            }
        case BlockType.DATE_RANGE:
            return {
                dateStart: record.dateStart ?? '',
                'onUpdate:dateStart': (v: string) => set({ ...record, dateStart: v }),
                dateEnd: record.dateEnd ?? '',
                'onUpdate:dateEnd': (v: string) => set({ ...record, dateEnd: v }),
            }
        case BlockType.NETWORK_DEGREES:
            return {
                degreesSource: record.degreesSource ?? 0,
                'onUpdate:degreesSource': (v: number) => set({ ...record, degreesSource: v }),
                degreesTarget: record.degreesTarget ?? 0,
                'onUpdate:degreesTarget': (v: number) => set({ ...record, degreesTarget: v }),
            }
        case BlockType.DOC_TYPE_SELECTOR:
            return {
                decisions: record.decisions ?? false,
                'onUpdate:decisions': (v: boolean) => set({ ...record, decisions: v }),
                opinions: record.opinions ?? false,
                'onUpdate:opinions': (v: boolean) => set({ ...record, opinions: v }),
            }
        default:
            return {}
    }
})
</script>

<style scoped>
.field-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.field-description {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
}

.field-unsupported {
    margin: 0;
    font-size: 13px;
    color: #b45309;
}
</style>
