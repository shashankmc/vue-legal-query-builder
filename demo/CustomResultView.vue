<template>
    <!-- A host view: the same result, as a table. Registered through the
         `resultViews` prop, keyed by the kind the database declares. -->
    <table class="custom-results">
        <thead>
            <tr>
                <th>#</th>
                <th>Title</th>
                <th>Source</th>
                <th>Court</th>
                <th>Date</th>
                <th>Score</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="entry in shaped.entries" :key="entry.id">
                <td>{{ entry.position }}</td>
                <td>
                    <a v-if="entry.url" :href="entry.url" target="_blank" rel="noopener noreferrer">{{ entry.title }}</a>
                    <span v-else>{{ entry.title }}</span>
                </td>
                <td>{{ entry.source ?? '—' }}</td>
                <td>{{ entry.court ?? '—' }}</td>
                <td>{{ entry.date ?? '—' }}</td>
                <td>{{ formatScore(entry.score) }}</td>
            </tr>
            <tr v-if="shaped.empty">
                <td colspan="6" class="empty">No results.</td>
            </tr>
        </tbody>
    </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatScore, toResultEntries } from '../src'

const props = defineProps<{ result: unknown }>()

const shaped = computed(() => toResultEntries(props.result))
</script>

<style scoped>
.custom-results {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.custom-results th,
.custom-results td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid #e5e7eb;
}

.custom-results th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
}

.custom-results .empty {
    color: #6b7280;
}
</style>
