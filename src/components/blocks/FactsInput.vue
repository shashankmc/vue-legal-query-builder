<template>
    <TextAreaInput
        fieldId="facts-input"
        :value="facts"
        @update:value="emit('update:facts', $event ?? '')"
        :placeholder="placeholder || ''"
        label="Facts"
    />
</template>

<script setup lang="ts">
import TextAreaInput from './TextAreaInput.vue'

const props = defineProps<{
    facts: string
    placeholder?: string
}>()

const emit = defineEmits<{
    'update:facts': [value: string]
}>()
</script>
