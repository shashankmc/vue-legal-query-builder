<template>
    <div class="rbar">
        <div v-if="views.length > 1" class="rbar-views" role="group" aria-label="Result layout">
            <button v-for="option in views" :key="option.kind" type="button" class="rbar-view"
                :aria-pressed="option.kind === view" @click="emit('update:view', option.kind)">
                {{ option.label }}
            </button>
        </div>

        <details v-if="available.length > 0" class="rbar-columns">
            <summary>Fields ({{ visible.length }}/{{ available.length }})</summary>
            <div class="rbar-panel">
                <p class="rbar-hint">Fields these results carry. Your choice is kept for these sources.</p>
                <ul>
                    <li v-for="(field, index) in ordered" :key="field.key">
                        <label>
                            <input type="checkbox" :checked="isVisible(field.key)" @change="toggle(field.key)" />
                            {{ field.label }}
                        </label>
                        <span v-if="isVisible(field.key)" class="rbar-move">
                            <button type="button" :disabled="index === 0" :aria-label="`Move ${field.label} earlier`"
                                @click="move(field.key, -1)">↑</button>
                            <button type="button" :disabled="index === visible.length - 1"
                                :aria-label="`Move ${field.label} later`" @click="move(field.key, 1)">↓</button>
                        </span>
                    </li>
                </ul>
                <button type="button" class="rbar-reset" @click="emit('reset')">Reset to defaults</button>
            </div>
        </details>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ResultFieldDescriptor } from './resultFields'

const props = defineProps<{
    views: { kind: string; label: string }[]
    view: string | undefined
    /** Every field the current results carry. */
    available: ResultFieldDescriptor[]
    /** Keys of the fields shown, in order. */
    visible: string[]
}>()

const emit = defineEmits<{
    'update:view': [kind: string]
    'update:visible': [keys: string[]]
    reset: []
}>()

/** Shown fields first, in their order, then the rest. */
const ordered = computed(() => {
    const byKey = new Map(props.available.map((field) => [field.key, field]))
    const shown = props.visible.map((key) => byKey.get(key)).filter((f): f is ResultFieldDescriptor => !!f)
    const hidden = props.available.filter((field) => !props.visible.includes(field.key))
    return [...shown, ...hidden]
})

function isVisible(key: string) {
    return props.visible.includes(key)
}

function toggle(key: string) {
    emit('update:visible', isVisible(key) ? props.visible.filter((k) => k !== key) : [...props.visible, key])
}

function move(key: string, step: -1 | 1) {
    const keys = [...props.visible]
    const from = keys.indexOf(key)
    const to = from + step
    if (from < 0 || to < 0 || to >= keys.length) return
    ;[keys[from], keys[to]] = [keys[to], keys[from]]
    emit('update:visible', keys)
}
</script>

<style scoped>
.rbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 10px;
}

.rbar-views {
    display: inline-flex;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    overflow: hidden;
}

.rbar-view {
    border: 0;
    background: #fff;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    min-height: 32px;
}

.rbar-view + .rbar-view {
    border-left: 1px solid #d1d5db;
}

.rbar-view[aria-pressed='true'] {
    background: #1b6b93;
    color: #fff;
}

.rbar-columns {
    font-size: 13px;
}

.rbar-columns summary {
    cursor: pointer;
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    min-height: 32px;
    box-sizing: border-box;
    list-style: none;
}

.rbar-columns summary::-webkit-details-marker {
    display: none;
}

.rbar-panel {
    margin-top: 6px;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    max-width: 22rem;
}

.rbar-hint {
    margin: 0 0 8px;
    color: #6b7280;
    font-size: 12px;
}

.rbar-panel ul {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    max-height: 18rem;
    overflow-y: auto;
}

.rbar-panel li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
}

.rbar-panel label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.rbar-move button,
.rbar-reset {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 12px;
    cursor: pointer;
}

.rbar-move button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>
