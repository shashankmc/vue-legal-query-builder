<template>
    <details class="resolve-panel">
        <summary>Resolve a citation</summary>

        <form class="resolve-form" @submit.prevent="submit">
            <p class="resolve-hint">
                Give a loose citation — <code>art. 6 code civil</code>, an ECLI, a CELEX number — and
                the provider returns the document it names.
            </p>

            <label>
                Citation
                <input v-model="reference" type="text" required placeholder="e.g. BVerfG 1 BvR 123/20" />
            </label>

            <div class="resolve-row">
                <label>
                    Country hint
                    <input v-model="hintCountry" type="text" placeholder="e.g. FR" />
                </label>
                <label>
                    Type hint
                    <select v-model="hintType">
                        <option value="">Any</option>
                        <option value="case_law">Case law</option>
                        <option value="legislation">Legislation</option>
                    </select>
                </label>
            </div>

            <div class="resolve-actions">
                <button type="submit" :disabled="loading || reference.trim() === ''">
                    {{ loading ? 'Resolving…' : 'Resolve' }}
                </button>
            </div>
        </form>

        <p v-if="error" class="resolve-error" role="alert">{{ error.message }}</p>

        <div v-if="resolution" class="resolve-result">
            <p class="resolve-match">
                Match: <strong>{{ resolution.matchType }}</strong>
                <span v-if="resolution.matchType === 'ambiguous'" class="resolve-note">
                    — more than one document matched
                </span>
            </p>
            <!-- The same view the search results use: a resolved reference is
                 just a hit with a match type. -->
            <RankedList :result="{ hits: resolution.hits }" :loading="loading"
                :can-open-document="canOpenDocument" @open-document="emit('openDocument', $event)" />
        </div>
    </details>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import RankedList from '../RankedList.vue'
import type { ResultEntry } from '../resultEntries'
import { useLegalSearchRuntimeContext } from './useLegalSearchRuntime'

const emit = defineEmits<{ openDocument: [entry: ResultEntry] }>()

const runtime = useLegalSearchRuntimeContext()

const reference = ref('')
const hintCountry = ref('')
const hintType = ref('')

const resolution = computed(() => runtime?.resolution.value)
const loading = computed(() => runtime?.resolveLoading.value ?? false)
const error = computed(() => runtime?.resolveError.value)
const canOpenDocument = computed(() => runtime?.canUse('getDocument') ?? false)

async function submit() {
  if (!runtime || reference.value.trim() === '') return
  try {
    await runtime.resolveReference({
      reference: reference.value.trim(),
      hintCountry: hintCountry.value.trim() || undefined,
      hintType: hintType.value || undefined,
    })
  } catch {
    // The runtime holds the error; it is rendered above.
  }
}
</script>

<style scoped>
.resolve-panel {
    margin-top: 16px;
    padding: 12px 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
}

.resolve-panel summary {
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
}

.resolve-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
}

.resolve-hint {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
}

.resolve-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #374151;
}

.resolve-form input,
.resolve-form select {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
}

.resolve-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.resolve-actions {
    display: flex;
    justify-content: flex-end;
}

.resolve-actions button {
    padding: 8px 18px;
    border: none;
    border-radius: 6px;
    background: #3b82f6;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
}

.resolve-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.resolve-error {
    margin: 12px 0 0;
    font-size: 13px;
    color: #dc2626;
}

.resolve-result {
    margin-top: 12px;
}

.resolve-match {
    margin: 0 0 8px;
    font-size: 13px;
    color: #374151;
}

.resolve-note {
    color: #92400e;
}
</style>
