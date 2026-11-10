<template>
    <details class="runtime-field-panel" :open="open">
        <summary @click.prevent="open = !open">Customize fields</summary>

        <div v-if="open" class="panel-body">
            <p class="panel-hint">
                Required fields are pinned by the provider and cannot be hidden or moved.
            </p>

            <ol class="field-list">
                <li v-for="field in fields" :key="field.key" class="field-row"
                    :class="{ 'is-pinned': !isConfigurable(field) }">
                    <label v-if="isConfigurable(field)" class="field-toggle">
                        <input type="checkbox" :checked="!isHidden(field)"
                            @change="toggle(field, ($event.target as HTMLInputElement).checked)" />
                        <span class="visually-hidden">Show {{ field.label }}</span>
                    </label>
                    <span v-else class="field-pin" :title="`${field.label} is required`" aria-hidden="true">•</span>

                    <span class="field-name" :class="{ 'is-hidden': isHidden(field) }">{{ field.label }}</span>

                    <span v-if="field.required" class="field-tag">required</span>
                    <span v-if="field.advanced" class="field-tag">advanced</span>

                    <span class="field-move">
                        <button type="button" class="move" :disabled="!canMove(field, -1)"
                            :aria-label="`Move ${field.label} up`" @click="move(field, -1)">↑</button>
                        <button type="button" class="move" :disabled="!canMove(field, 1)"
                            :aria-label="`Move ${field.label} down`" @click="move(field, 1)">↓</button>
                    </span>
                </li>
            </ol>

            <button type="button" class="reset" @click="reset()">Reset to provider default</button>
        </div>
    </details>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FieldDescriptor } from 'legal-retrieval-types'
import type { LegalSearchRuntime } from './useLegalSearchRuntime'
import { isUserConfigurable, orderFields } from './runtimeState'

const props = defineProps<{ runtime: LegalSearchRuntime }>()

const open = ref(false)

// Every field the database declares, in the order the form would show them.
const fields = computed(() =>
    orderFields(props.runtime.activeFields.value, props.runtime.activeLayout.value),
)

const configurable = computed(() => fields.value.filter(isUserConfigurable))

function isConfigurable(field: FieldDescriptor): boolean {
    return isUserConfigurable(field)
}

function isHidden(field: FieldDescriptor): boolean {
    return props.runtime.activeLayout.value.hidden.includes(field.key)
}

function canMove(field: FieldDescriptor, delta: number): boolean {
    if (!isConfigurable(field)) return false
    const order = configurable.value.map((entry) => entry.key)
    const index = order.indexOf(field.key)
    const target = index + delta
    return index >= 0 && target >= 0 && target < order.length
}

function toggle(field: FieldDescriptor, visible: boolean) {
    props.runtime.toggleField(field.key, visible)
}

function move(field: FieldDescriptor, delta: number) {
    props.runtime.moveField(field.key, delta)
}

function reset() {
    props.runtime.resetLayout()
}
</script>

<style>
@import '../../styles/shared.css';
</style>

<style scoped>
.runtime-field-panel {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 12px;
    background: #f9fafb;
}

.runtime-field-panel summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
}

.panel-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
}

.panel-hint {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
}

.field-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.field-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 13px;
}

.field-row.is-pinned {
    opacity: 0.75;
}

.field-toggle {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}

.field-pin {
    color: #9ca3af;
}

.field-name {
    flex: 1;
    min-width: 0;
    color: #374151;
}

.field-name.is-hidden {
    text-decoration: line-through;
    color: #9ca3af;
}

.field-tag {
    font-size: 11px;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    padding: 0 6px;
}

.field-move {
    display: inline-flex;
    gap: 2px;
}

.move {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    line-height: 1;
}

.move:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.reset {
    align-self: flex-start;
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}
</style>
