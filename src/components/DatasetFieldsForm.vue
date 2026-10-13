<template>
    <form @submit.prevent="handleSubmit" class="dataset-fields-form">
        <DatasetSelector v-model:selectedDataset="formData.selectedDataset" />

        <FieldBlock
            v-for="field in fields"
            :key="field.key"
            :field="field"
            v-model="values[field.key]"
        />

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
import { computed } from 'vue'
import { Search } from 'lucide-vue-next'
import type { DatasetDescriptor } from 'legal-retrieval-types'
import { validateDatasetFields } from './datasetFields'
import DatasetSelector from './blocks/DatasetSelector.vue'
import FieldBlock from './FieldBlock.vue'

const props = defineProps<{
    dataset: DatasetDescriptor
    formData: any
    values: Record<string, unknown>
    loading: boolean
}>()

const emit = defineEmits<{
    submit: [isValid: boolean]
    handleReset: []
}>()

const fields = computed(() => props.dataset.fields ?? [])

const handleSubmit = () => {
    emit('submit', validateDatasetFields(props.dataset, props.values))
}
</script>

<style scoped>
@import '../styles/shared.css';

.dataset-fields-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
}
</style>
