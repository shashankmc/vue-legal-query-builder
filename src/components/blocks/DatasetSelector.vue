<template>
    <div class="form-group">
        <label>Dataset</label>
        <div class="button-group">
            <button v-for="dataset in datasets" :key="dataset.id" type="button" :disabled="dataset.disabled"
                @click="selectedDataset = dataset.id" :class="{ 'active': selectedDataset === dataset.id }">
                {{ dataset.label }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, type InjectionKey, type Ref } from 'vue'
import type { Dataset, DatasetDescriptor } from '../types'
import { BUILT_IN_DATASETS } from '../types'

const selectedDataset = defineModel<Dataset>('selectedDataset')

// The form provides the dataset list it was configured with; a host that
// passed none gets the built-ins. See docs/dataset-agnostic-seam.md.
const datasetsInjected = inject<Ref<DatasetDescriptor[]>>(
    'legal-docs-form-datasets' as unknown as InjectionKey<Ref<DatasetDescriptor[]>>,
    computed(() => BUILT_IN_DATASETS),
)
const datasets = computed(() => datasetsInjected.value)
</script>

<style>
@import '../../styles/shared.css';
</style>

<style scoped>
.button-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

button:hover:not(:disabled) {
    border-color: #3b82f6;
    background: #eff6ff;
}

button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
