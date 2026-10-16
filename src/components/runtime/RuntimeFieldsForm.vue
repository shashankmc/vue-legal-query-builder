<template>
    <form class="runtime-fields-form" @submit.prevent="handleSubmit">
        <div v-if="allowCustomization || hasAdvanced" class="runtime-fields-toolbar">
            <button v-if="hasAdvanced" type="button" class="link-button"
                @click="runtime.setShowAdvanced(!runtime.showAdvancedFields.value)">
                {{ runtime.showAdvancedFields.value ? 'Hide advanced fields' : 'Show advanced fields' }}
            </button>
            <RuntimeFieldPanel v-if="allowCustomization" :runtime="runtime" />
        </div>

        <p v-if="fields.length === 0" class="runtime-fields-empty">
            This database declares no fields yet.
        </p>

        <RuntimeField v-for="field in fields" :key="field.key" :field="field"
            :model-value="runtime.activeValues.value[field.key]" :disabled="loading"
            :components="components" :error="attempted ? validation.errors[field.key] : undefined"
            @update:model-value="runtime.setValue(field.key, $event)" />

        <div class="form-actions">
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="emit('handleReset')">
                Reset
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
                <Search :size="16" />
                {{ loading ? 'Searching...' : 'Search' }}
            </button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Search } from 'lucide-vue-next'
import RuntimeField from './RuntimeField.vue'
import RuntimeFieldPanel from './RuntimeFieldPanel.vue'
import type { LegalSearchRuntime } from './useLegalSearchRuntime'
import { validateFields } from './runtimeState'

const props = defineProps<{
    runtime: LegalSearchRuntime
    loading: boolean
    /** Host field components, keyed by `FieldDescriptor.block` (or `control`). */
    components?: Record<string, Component>
}>()

const emit = defineEmits<{
    submit: [isValid: boolean]
    handleReset: []
}>()

// Errors appear only after a submit attempt, so the form does not scold a user
// who has not finished typing.
const attempted = ref(false)

const fields = computed(() => props.runtime.visibleFields.value)
const allowCustomization = computed(() => props.runtime.allowFieldCustomization.value)
const hasAdvanced = computed(() => props.runtime.activeFields.value.some((field) => field.advanced === true))

const validation = computed(() =>
    validateFields(fields.value, props.runtime.activeValues.value),
)

function handleSubmit() {
    attempted.value = true
    emit('submit', validation.value.valid)
}
</script>

<style>
@import '../../styles/shared.css';
</style>

<style scoped>
.runtime-fields-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.runtime-fields-empty {
    margin: 0;
    font-size: 13px;
    color: #6b7280;
}

.runtime-fields-toolbar {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.link-button {
    align-self: flex-start;
    border: none;
    background: none;
    padding: 0;
    font-size: 13px;
    color: #2563eb;
    cursor: pointer;
    text-decoration: underline;
}

.form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
}

.form-actions button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
}

.btn-primary {
    background: #3b82f6;
    color: #fff;
    border: none;
}

.btn-primary:hover:not(:disabled) {
    background: #2563eb;
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
}

.form-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
