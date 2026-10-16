<template>
    <!-- Resolution order: a host-supplied component, then a specialised block,
         then the generic control, then an honest "unsupported" note. -->
    <component :is="hostComponent" v-if="hostComponent" v-bind="hostBindings" />

    <FieldBlock v-else-if="field.block" :field="field" :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)" />

    <div v-else-if="field.control" class="runtime-field form-group">
        <label v-if="field.control === 'boolean'" class="checkbox-label">
            <input type="checkbox" :checked="modelValue === true" :disabled="disabled"
                @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
            {{ field.label }}<span v-if="field.required" class="required-asterisk">*</span>
        </label>

        <template v-else>
            <label :for="inputId">
                {{ field.label }}<span v-if="field.required" class="required-asterisk">*</span>
            </label>

            <OptionSelect v-if="isSelect" :model-value="selectValue" :options="options" :multiple="isMulti"
                :placeholder="field.placeholder" :disabled="disabled" />

            <template v-else-if="field.control === 'range'">
                <input :id="inputId" type="range" :min="field.min ?? 0" :max="field.max ?? 100"
                    :step="field.step ?? 1" :value="numberValue" :disabled="disabled"
                    @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))" />
                <span class="range-value">{{ numberValue }}</span>
            </template>

            <textarea v-else-if="field.control === 'textarea'" :id="inputId" :value="stringValue"
                :placeholder="field.placeholder" :disabled="disabled"
                @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" />

            <input v-else :id="inputId" :type="inputType" :value="inputValue" :placeholder="field.placeholder"
                :disabled="disabled" :min="field.min" :max="field.max" :step="field.step"
                @input="onInput" />
        </template>

        <p v-if="field.description" class="field-description">{{ field.description }}</p>
        <p v-if="error" class="runtime-field-error" role="alert">{{ error }}</p>
    </div>

    <div v-else class="runtime-field form-group">
        <p class="field-unsupported">
            Unsupported field "{{ field.key }}": no block, control or host component matched.
        </p>
    </div>
</template>

<script lang="ts">
// Module-scoped, so every mounted field gets its own dom id.
let fieldUid = 0
function nextFieldId(): number {
    return ++fieldUid
}
</script>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { FieldDescriptor } from 'legal-retrieval-types'
import FieldBlock from '../FieldBlock.vue'
import OptionSelect from './OptionSelect.vue'

const props = defineProps<{
    field: FieldDescriptor
    modelValue?: unknown
    disabled?: boolean
    error?: string
    /** Host components, keyed by `FieldDescriptor.block` (or `control`). */
    components?: Record<string, Component>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const inputId = `runtime-field-${nextFieldId()}`

// A host component wins over the built-in block and the generic control. The
// field's own inputs are passed through; the host owns the rest.
const hostComponent = computed<Component | undefined>(() => {
    if (!props.components) return undefined
    if (props.field.block && props.components[props.field.block]) return props.components[props.field.block]
    if (props.field.control && props.components[props.field.control]) return props.components[props.field.control]
    return undefined
})

const hostBindings = computed(() => ({
    field: props.field,
    modelValue: props.modelValue,
    disabled: props.disabled,
    error: props.error,
    'onUpdate:modelValue': (value: unknown) => emit('update:modelValue', value),
}))

const selectControls = ['select', 'multiselect', 'remote-select']

const isSelect = computed(() => selectControls.includes(props.field.control ?? ''))
const isMulti = computed(
    () => props.field.control === 'multiselect' || props.field.multiple === true,
)
const options = computed(() => props.field.options ?? [])

const selectValue = computed(() => {
    if (isMulti.value) return Array.isArray(props.modelValue) ? (props.modelValue as string[]) : []
    return typeof props.modelValue === 'string' ? props.modelValue : undefined
})

const stringValue = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''))

const numberValue = computed(() =>
    typeof props.modelValue === 'number'
        ? props.modelValue
        : props.field.min ?? 0,
)

const inputType = computed(() => {
    if (props.field.control === 'number') return 'number'
    if (props.field.control === 'date') return 'date'
    return 'text'
})

const inputValue = computed(() => {
    if (props.modelValue === undefined || props.modelValue === null) return ''
    return String(props.modelValue)
})

function onInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value
    if (props.field.control === 'number') {
        emit('update:modelValue', raw === '' ? undefined : Number(raw))
        return
    }
    emit('update:modelValue', raw)
}
</script>

<style>
@import '../../styles/shared.css';
</style>

<style scoped>
.runtime-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.runtime-field label {
    font-weight: 500;
    color: #374151;
    font-size: 14px;
}

.runtime-field input[type='text'],
.runtime-field input[type='number'],
.runtime-field input[type='date'],
.runtime-field textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    box-sizing: border-box;
}

.runtime-field input[type='range'] {
    width: 100%;
}

.runtime-field input:focus,
.runtime-field textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.range-value {
    font-size: 13px;
    color: #6b7280;
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

.checkbox-label input[type='checkbox'] {
    width: auto;
    cursor: pointer;
}

.field-description {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
}

.runtime-field-error {
    margin: 0;
    font-size: 12px;
    color: #dc2626;
}

.field-unsupported {
    margin: 0;
    font-size: 12px;
    color: #b45309;
}
</style>
