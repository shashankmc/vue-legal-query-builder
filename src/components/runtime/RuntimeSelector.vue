<template>
    <div class="runtime-selector">
        <div class="runtime-selector-grid">
            <OptionSelect :model-value="runtime.providerId.value" :options="providerOptions" label="Provider"
                placeholder="Select a provider" @update:model-value="onProvider" />

            <OptionSelect v-if="databaseOptions.length > 0" :model-value="runtime.databaseId.value"
                :options="databaseOptions" label="Database" placeholder="Select a database"
                @update:model-value="onDatabase" />

            <template v-if="discoveryAvailable">
                <OptionSelect :model-value="runtime.discoveryCountry.value" :options="countryOptions"
                    label="Country" placeholder="All countries" :loading="runtime.discovery.loading"
                    @update:model-value="onCountry" />

                <OptionSelect :model-value="runtime.discoverySource.value" :options="sourceOptions" label="Source"
                    placeholder="All sources" :loading="runtime.discovery.loading" @update:model-value="onSource" />
            </template>
        </div>

        <div class="runtime-selector-status">
            <p v-if="activeProvider?.description" class="runtime-selector-description">
                {{ activeProvider.description }}
            </p>
            <p v-if="activeProvider?.unavailableReason" class="runtime-selector-unavailable">
                {{ activeProvider.unavailableReason }}
            </p>
            <p v-if="activeDatabase?.description" class="runtime-selector-description">
                {{ activeDatabase.description }}
            </p>
            <p v-if="runtime.discovery.error" class="runtime-selector-error" role="alert">
                {{ runtime.discovery.error.message }}
                <button type="button" class="runtime-selector-retry" @click="runtime.refreshDiscovery()">
                    Retry
                </button>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OptionSelect, { type SelectOption } from './OptionSelect.vue'
import type { LegalSearchRuntime } from './useLegalSearchRuntime'

const props = defineProps<{ runtime: LegalSearchRuntime }>()

const activeProvider = computed(() => props.runtime.activeProvider.value)
const activeDatabase = computed(() => props.runtime.activeDatabase.value)

const providerOptions = computed<SelectOption[]>(() =>
    props.runtime.providers.value.map((provider) => ({
        value: provider.id,
        label: provider.label,
        description: provider.unavailableReason ?? provider.description,
        disabled: provider.disabled || Boolean(provider.unavailableReason),
    })),
)

const databaseOptions = computed<SelectOption[]>(() =>
    props.runtime.databasesOfActiveProvider.value.map((database) => ({
        value: database.id,
        label: database.label,
        description: database.description ?? database.kind,
        disabled: database.disabled,
    })),
)

const countryOptions = computed<SelectOption[]>(() =>
    props.runtime.discovery.countries.map((country) => ({
        value: country.value,
        label: country.label,
        description: country.count !== undefined ? `${country.count.toLocaleString()} documents` : undefined,
    })),
)

const sourceOptions = computed<SelectOption[]>(() =>
    props.runtime.discovery.sources.map((source) => ({
        value: source.value,
        label: source.label,
        description: source.description,
        disabled: source.disabled,
    })),
)

// Discovery controls appear only when the provider advertises (or has proved)
// that it can be discovered, so a provider without it keeps a clean selector.
const discoveryAvailable = computed(
    () =>
        activeProvider.value?.capabilities?.supportsDiscovery === true ||
        props.runtime.discovery.countries.length > 0 ||
        props.runtime.discovery.loading,
)

function onProvider(value: string | string[] | undefined) {
    if (typeof value === 'string') props.runtime.setProvider(value)
}

function onDatabase(value: string | string[] | undefined) {
    if (typeof value === 'string') props.runtime.setDatabase(value)
}

function onCountry(value: string | string[] | undefined) {
    props.runtime.setDiscoveryCountry(typeof value === 'string' ? value : undefined)
}

function onSource(value: string | string[] | undefined) {
    props.runtime.setDiscoverySource(typeof value === 'string' ? value : undefined)
}
</script>

<style>
@import '../../styles/shared.css';
</style>

<style scoped>
.runtime-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}

.runtime-selector-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.runtime-selector-status {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.runtime-selector-description,
.runtime-selector-unavailable,
.runtime-selector-error {
    margin: 0;
    font-size: 12px;
}

.runtime-selector-description {
    color: #6b7280;
}

.runtime-selector-unavailable {
    color: #b45309;
}

.runtime-selector-error {
    color: #dc2626;
}

.runtime-selector-retry {
    margin-left: 8px;
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 12px;
    cursor: pointer;
}
</style>
