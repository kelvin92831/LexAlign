<template>
  <div class="space-y-4">
    <DocumentCard
      v-for="(group, index) in groupedSuggestions"
      :key="index"
      :group="group"
      :index="index"
    />
  </div>
</template>

<script setup>
import DocumentCard from './DocumentCard.vue'

defineProps({
  groupedSuggestions: Array
})
</script>
