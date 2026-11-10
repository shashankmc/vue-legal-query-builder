<template>
    <div class="rtable">
        <p v-if="warnings.length > 0" class="rtable-warning" role="status">{{ warnings.join(' ') }}</p>
        <p v-if="total !== undefined && !empty" class="rtable-total">
            {{ total.toLocaleString() }} {{ total === 1 ? 'result' : 'results' }}
            <span v-if="elapsedMs !== undefined">· {{ elapsedMs }} ms</span>
        </p>

        <p v-if="empty" class="rtable-empty">No results. Try broadening the query or removing a filter.</p>

        <!-- Scrolls sideways on a narrow screen rather than squeezing columns. -->
        <div v-else class="rtable-scroll" tabindex="0" role="region" aria-label="Results table">
            <table>
                <thead>
                    <tr>
                        <th scope="col" class="rtable-num">#</th>
                        <th scope="col">Title</th>
                        <th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th>
                        <th scope="col" class="rtable-num">Score</th>
                        <th v-if="canOpenDocument" scope="col"><span class="rtable-sr">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in entries" :key="entry.id">
                        <td class="rtable-num">{{ entry.position }}</td>
                        <td class="rtable-title">
                            <a v-if="entry.url" :href="entry.url" target="_blank" rel="noopener noreferrer">
                                {{ entry.title || entry.id }}
                            </a>
                            <span v-else>{{ entry.title || entry.id }}</span>
                        </td>
                        <td v-for="column in columns" :key="column.key" :class="cellClass(column)">
                            <template v-if="column.type === 'url' && cell(entry, column)">
                                <a :href="cell(entry, column)" target="_blank" rel="noopener noreferrer">
                                    {{ cell(entry, column) }}
                                </a>
                            </template>
                            <template v-else>{{ cell(entry, column) }}</template>
                        </td>
                        <td class="rtable-num">{{ formatScore(entry.score) }}</td>
                        <td v-if="canOpenDocument">
                            <button type="button" class="rtable-open" @click="emit('openDocument', entry)">
                                View
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="nextCursor" class="rtable-more">
            <button type="button" :disabled="loading" @click="emit('loadMore')">
                {{ loading ? 'Loading…' : 'Load more' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatScore, toResultEntries, type ResultEntry } from './resultEntries'
import { formatResultValue, resultFieldValue, type ResultFieldDescriptor } from './resultFields'

const props = defineProps<{
    result: unknown
    /** The fields to show as columns, in order. */
    columns: ResultFieldDescriptor[]
    loading?: boolean
    canOpenDocument?: boolean
}>()

const emit = defineEmits<{
    loadMore: []
    openDocument: [entry: ResultEntry]
}>()

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

function cell(entry: ResultEntry, column: ResultFieldDescriptor): string {
    return formatResultValue(resultFieldValue(entry, column.key), column.type)
}

function cellClass(column: ResultFieldDescriptor) {
    return {
        'rtable-num': column.type === 'number',
        'rtable-code': column.type === 'code' || column.type === 'url',
        'rtable-long': column.type === 'longtext',
    }
}
</script>

<style scoped>
.rtable {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.rtable-warning {
    margin: 0;
    padding: 8px 12px;
    border-radius: 6px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    font-size: 13px;
}

.rtable-total,
.rtable-empty {
    margin: 0;
    font-size: 13px;
    color: #6b7280;
}

.rtable-scroll {
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    -webkit-overflow-scrolling: touch;
}

.rtable-scroll:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
}

th,
td {
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #f3f4f6;
}

th {
    position: sticky;
    top: 0;
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
}

tbody tr:last-child td {
    border-bottom: 0;
}

.rtable-title {
    min-width: 14rem;
    font-weight: 600;
}

.rtable-title a {
    color: #1b6b93;
}

.rtable-num {
    text-align: right;
    white-space: nowrap;
    color: #6b7280;
}

.rtable-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    white-space: nowrap;
}

.rtable-long {
    min-width: 18rem;
    color: #4b5563;
}

.rtable-open {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
}

.rtable-open:hover {
    border-color: #3b82f6;
    color: #2563eb;
}

.rtable-more button {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 6px;
    padding: 6px 14px;
    cursor: pointer;
}

.rtable-more button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.rtable-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
}
</style>
