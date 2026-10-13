<template>
    <ul class="ranked-list">
        <li v-for="(doc, index) in documents" :key="doc.doc_id ?? index" class="ranked-item">
            <span class="ranked-position">{{ index + 1 }}</span>
            <div class="ranked-body">
                <div class="ranked-title">{{ doc.title ?? doc.doc_id }}</div>
                <div v-if="doc.top_provision" class="ranked-top">Top: {{ doc.top_provision }}</div>
                <div v-if="doc.score !== undefined" class="ranked-score-row">
                    <div class="ranked-score-track">
                        <div class="ranked-score-fill" :style="{ width: scoreWidth(doc.score) + '%' }"></div>
                    </div>
                    <span class="ranked-score-num">{{ formatScore(doc.score) }}</span>
                </div>
            </div>
        </li>
        <li v-if="documents.length === 0" class="ranked-empty">No results.</li>
    </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface RankedDocument {
    doc_id?: string
    title?: string
    score?: number
    top_provision?: string
}

const props = defineProps<{ result: unknown }>()

const documents = computed<RankedDocument[]>(() => {
    const result = props.result as { documents?: unknown } | unknown[] | null
    if (Array.isArray(result)) return result as RankedDocument[]
    if (result && typeof result === 'object' && Array.isArray((result as { documents?: unknown }).documents)) {
        return (result as { documents: RankedDocument[] }).documents
    }
    return []
})

const scoreWidth = (score: number): number => Math.max(0, Math.min(100, score * 100))

const formatScore = (score: number): string =>
    Number.isFinite(score) ? score.toFixed(3) : '-'
</script>

<style scoped>
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

.ranked-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
}

.ranked-top {
    font-size: 11px;
    color: #9aacb8;
    font-family: monospace;
    margin-top: 2px;
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
</style>
