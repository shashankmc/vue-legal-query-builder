<template>
    <div class="ranked">
        <!-- What the provider said about the set, when it said anything. -->
        <p v-if="warnings.length > 0" class="ranked-warning" role="status">
            {{ warnings.join(' ') }}
        </p>
        <p v-if="total !== undefined && !empty" class="ranked-total">
            {{ total.toLocaleString() }} {{ total === 1 ? 'result' : 'results' }}
            <span v-if="elapsedMs !== undefined" class="ranked-elapsed">· {{ elapsedMs }} ms</span>
        </p>

        <ul class="ranked-list">
            <li v-for="entry in entries" :key="entry.id" class="ranked-item">
                <span class="ranked-position">{{ entry.position }}</span>

                <div class="ranked-body">
                    <div class="ranked-heading">
                        <a v-if="entry.url" class="ranked-title" :href="entry.url" target="_blank"
                            rel="noopener noreferrer">{{ entry.title || entry.id }}</a>
                        <span v-else class="ranked-title">{{ entry.title || entry.id }}</span>
                    </div>

                    <p v-if="entry.snippet" class="ranked-snippet">{{ entry.snippet }}</p>

                    <dl v-if="facts(entry).length > 0" class="ranked-facts">
                        <div v-for="fact in facts(entry)" :key="fact.label" class="ranked-fact">
                            <dt>{{ fact.label }}</dt>
                            <dd>{{ fact.value }}</dd>
                        </div>
                    </dl>

                    <div v-if="entry.score !== undefined" class="ranked-score-row">
                        <div class="ranked-score-track">
                            <div class="ranked-score-fill" :style="{ width: scorePercent(entry.score) + '%' }"></div>
                        </div>
                        <span class="ranked-score-num">{{ formatScore(entry.score) }}</span>
                    </div>
                </div>
            </li>

            <li v-if="empty" class="ranked-empty">
                No results. Try broadening the query or removing a filter.
            </li>
        </ul>

        <div v-if="nextCursor" class="ranked-more">
            <button type="button" :disabled="loading" @click="emit('loadMore')">
                {{ loading ? 'Loading…' : 'Load more' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatScore, scorePercent, toResultEntries, type ResultEntry } from './resultEntries'

const props = defineProps<{
    result: unknown
    loading?: boolean
}>()

const emit = defineEmits<{ loadMore: [] }>()

const shaped = computed(() => toResultEntries(props.result))
const entries = computed(() => shaped.value.entries)
const warnings = computed(() => {
    const notes = [...shaped.value.warnings]
    if (shaped.value.partial) notes.push('Some results are truncated.')
    return notes
})
const total = computed(() => shaped.value.total)
const elapsedMs = computed(() => shaped.value.elapsedMs)
const empty = computed(() => shaped.value.empty)
const nextCursor = computed(() => shaped.value.nextCursor)

/** The facts worth showing for a hit, skipping the ones it does not have. */
function facts(entry: ResultEntry): { label: string; value: string }[] {
    const pairs: [string, string | undefined][] = [
        ['Source', entry.source],
        ['Court', entry.court],
        ['Jurisdiction', entry.jurisdiction],
        ['Date', entry.date],
        ['Language', entry.language],
        ['ECLI', entry.ecli],
        ['Case', entry.caseNumber],
        ['Country', entry.country],
        ['Provision', entry.topProvision],
    ]
    return pairs
        .filter((pair): pair is [string, string] => typeof pair[1] === 'string' && pair[1] !== '')
        .map(([label, value]) => ({ label, value }))
}
</script>

<style scoped>
.ranked {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.ranked-warning {
    margin: 0;
    padding: 8px 12px;
    border-radius: 6px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    font-size: 13px;
}

.ranked-total {
    margin: 0;
    font-size: 13px;
    color: #6b7280;
}

.ranked-elapsed {
    color: #9ca3af;
}

.ranked-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ranked-item {
    display: flex;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
}

.ranked-position {
    font-size: 13px;
    font-weight: 700;
    color: #1b6b93;
    min-width: 20px;
    text-align: right;
}

.ranked-body {
    flex: 1;
    min-width: 0;
}

.ranked-heading {
    display: flex;
    gap: 8px;
}

.ranked-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    text-decoration: none;
}

a.ranked-title:hover {
    text-decoration: underline;
}

.ranked-snippet {
    margin: 4px 0 0;
    font-size: 13px;
    color: #4b5563;
    line-height: 1.5;
}

.ranked-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 6px 0 0;
}

.ranked-fact {
    display: flex;
    gap: 4px;
    font-size: 11px;
}

.ranked-fact dt {
    color: #9ca3af;
}

.ranked-fact dd {
    margin: 0;
    color: #6b7280;
    font-family: monospace;
}

.ranked-score-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
}

.ranked-score-track {
    flex: 1;
    height: 5px;
    background: #edf5fa;
    border-radius: 3px;
    overflow: hidden;
}

.ranked-score-fill {
    height: 100%;
    background: #1b6b93;
    border-radius: 3px;
}

.ranked-score-num {
    font-size: 11px;
    font-family: monospace;
    color: #1b6b93;
    min-width: 40px;
    text-align: right;
}

.ranked-empty {
    color: #6b7280;
    font-size: 13px;
}

.ranked-more {
    display: flex;
    justify-content: center;
}

.ranked-more button {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 6px;
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
}

.ranked-more button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
