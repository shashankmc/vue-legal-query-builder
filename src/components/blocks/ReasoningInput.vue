<template>
    <TextAreaInput
        fieldId="reasoning-input"
        :value="reasoning"
        @update:value="emit('update:reasoning', $event ?? '')"
        :placeholder="placeholder || ''"
        label="Reasoning"
    />
</template>

<script setup lang="ts">
import TextAreaInput from './TextAreaInput.vue'

const props = defineProps<{
    reasoning: string
    placeholder?: string
}>()

const emit = defineEmits<{
    'update:reasoning': [value: string]
}>()
</script>
