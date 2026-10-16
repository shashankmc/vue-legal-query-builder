<template>
    <div ref="root" class="option-select" :class="{ 'is-disabled': disabled }">
        <label v-if="label" :for="inputId" class="option-select-label">
            {{ label }}<span v-if="required" class="required-asterisk">*</span>
        </label>

        <div class="option-select-control" @click="onControlClick">
            <span v-for="chip in selectedOptions" :key="chip.value" class="option-select-chip">
                {{ chip.label }}
                <button v-if="!disabled" type="button" class="option-select-chip-remove"
                    :aria-label="`Remove ${chip.label}`" @click.stop="remove(chip.value)">
                    ×
                </button>
            </span>

            <input :id="inputId" ref="inputEl" class="option-select-input" type="text" role="combobox" autocomplete="off"
                :disabled="disabled" :placeholder="selectedOptions.length ? '' : placeholder" :aria-expanded="open"
                :aria-controls="listboxId" :aria-activedescendant="activeDescendant" :value="query"
                @input="onInput" @focus="onFocus" @keydown="onKeydown" />
        </div>

        <ul v-if="open" :id="listboxId" class="option-select-list" role="listbox" :aria-multiselectable="multiple">
            <li v-if="filtered.length === 0" class="option-select-empty">{{ emptyText }}</li>
            <li v-for="(option, index) in filtered" :id="`${listboxId}-${index}`" :key="option.value"
                class="option-select-option" role="option" :aria-selected="isSelected(option.value)"
                :aria-disabled="option.disabled" :class="{
                    'is-active': index === highlight,
                    'is-selected': isSelected(option.value),
                    'is-disabled': option.disabled,
                }" @mousedown.prevent="choose(option.value)" @mousemove="highlight = index">
                <span class="option-select-option-label">{{ option.label }}</span>
                <span v-if="option.description" class="option-select-option-description">{{ option.description }}</span>
            </li>
        </ul>

        <p v-if="loading" class="option-select-hint" role="status">Loading…</p>
        <p v-if="error" class="option-select-error" role="alert">{{ error }}</p>
    </div>
</template>

<script lang="ts">
/**
 * An option a select can offer. `FieldOption` and `DiscoveryOption` both fit.
 */
export interface SelectOption {
    value: string
    label: string
    description?: string
    count?: number
    disabled?: boolean
}

// Module-scoped, so every mounted select gets its own dom ids.
let selectUid = 0
export function nextOptionSelectId(): number {
    return ++selectUid
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
    modelValue?: string | string[]
    options: SelectOption[]
    multiple?: boolean
    label?: string
    placeholder?: string
    emptyText?: string
    disabled?: boolean
    loading?: boolean
    error?: string
    required?: boolean
}>(), {
    placeholder: 'Select…',
    emptyText: 'No matches',
})

const emit = defineEmits<{ 'update:modelValue': [value: string | string[] | undefined] }>()

const root = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const highlight = ref(0)

const unique = nextOptionSelectId()
const inputId = `option-select-${unique}`
const listboxId = `${inputId}-listbox`

const selectedValues = computed<string[]>(() => {
    if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue : []
    return typeof props.modelValue === 'string' && props.modelValue ? [props.modelValue] : []
})

const selectedOptions = computed<SelectOption[]>(() =>
    selectedValues.value.map(
        (value) => props.options.find((option) => option.value === value) ?? { value, label: value },
    ),
)

const filtered = computed(() => {
    const text = query.value.trim().toLowerCase()
    if (!text) return props.options
    return props.options.filter(
        (option) =>
            option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text),
    )
})

const activeDescendant = computed(() =>
    open.value && filtered.value.length > 0 ? `${listboxId}-${highlight.value}` : undefined,
)

watch(filtered, () => {
    highlight.value = 0
})

function isSelected(value: string): boolean {
    return selectedValues.value.includes(value)
}

function onInput(event: Event) {
    query.value = (event.target as HTMLInputElement).value
    open.value = true
}

function onFocus() {
    if (!props.disabled) open.value = true
}

function onControlClick() {
    if (props.disabled) return
    open.value = true
    inputEl.value?.focus()
}

function choose(value: string) {
    const option = props.options.find((entry) => entry.value === value)
    if (option?.disabled) return

    if (props.multiple) {
        const next = isSelected(value)
            ? selectedValues.value.filter((entry) => entry !== value)
            : [...selectedValues.value, value]
        emit('update:modelValue', next)
        query.value = ''
        highlight.value = 0
        return
    }

    emit('update:modelValue', value)
    query.value = ''
    open.value = false
    inputEl.value?.blur()
}

function remove(value: string) {
    if (props.multiple) {
        emit('update:modelValue', selectedValues.value.filter((entry) => entry !== value))
        return
    }
    emit('update:modelValue', undefined)
}

function onKeydown(event: KeyboardEvent) {
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            open.value = true
            highlight.value = Math.min(highlight.value + 1, Math.max(filtered.value.length - 1, 0))
            break
        case 'ArrowUp':
            event.preventDefault()
            highlight.value = Math.max(highlight.value - 1, 0)
            break
        case 'Enter': {
            event.preventDefault()
            const option = filtered.value[highlight.value]
            if (option) choose(option.value)
            break
        }
        case 'Escape':
            open.value = false
            query.value = ''
            break
        case 'Backspace':
            if (!query.value && props.multiple && selectedValues.value.length > 0) {
                remove(selectedValues.value[selectedValues.value.length - 1])
            }
            break
        default:
            break
    }
}

function onDocumentPointerDown(event: MouseEvent) {
    if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentPointerDown))
</script>

<style>
@import '../../styles/shared.css';
</style>

<style scoped>
.option-select {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.option-select-label {
    font-weight: 500;
    color: #374151;
    font-size: 14px;
}

.option-select-control {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    cursor: text;
    min-height: 40px;
}

.option-select-control:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.option-select.is-disabled .option-select-control {
    background: #f3f4f6;
    cursor: not-allowed;
}

.option-select-input {
    flex: 1 1 80px;
    min-width: 80px;
    border: none;
    outline: none;
    font-size: 14px;
    font-family: inherit;
    padding: 4px;
    background: transparent;
}

.option-select-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    font-size: 12px;
    color: #1e40af;
    max-width: 100%;
}

.option-select-chip-remove {
    border: none;
    background: transparent;
    cursor: pointer;
    color: #1e40af;
    font-size: 14px;
    line-height: 1;
    padding: 0;
}

.option-select-list {
    position: absolute;
    z-index: 20;
    top: 100%;
    left: 0;
    right: 0;
    margin: 4px 0 0;
    padding: 4px;
    list-style: none;
    max-height: 260px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.option-select-option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.option-select-option.is-active {
    background: #f3f4f6;
}

.option-select-option.is-selected {
    color: #1d4ed8;
    font-weight: 500;
}

.option-select-option.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.option-select-option-description {
    font-size: 12px;
    color: #6b7280;
}

.option-select-empty {
    padding: 10px;
    font-size: 13px;
    color: #6b7280;
}

.option-select-hint {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
}

.option-select-error {
    margin: 0;
    font-size: 12px;
    color: #dc2626;
}
</style>
