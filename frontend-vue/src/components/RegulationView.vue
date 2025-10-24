<template>
  <div class="space-y-4">
    <RegulationCard
      v-for="(suggestion, index) in suggestions"
      :key="index"
      :suggestion="suggestion"
      :index="index"
    />
  </div>
</template>

<script setup>
import RegulationCard from './RegulationCard.vue'

defineProps({
  suggestions: Array
})
</script>
