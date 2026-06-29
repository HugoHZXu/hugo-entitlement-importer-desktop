<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  wide?: boolean;
}>();
</script>

<template>
  <section class="chart-panel" :class="{ 'chart-panel--wide': wide }">
    <header class="chart-panel__header">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="action" />
    </header>

    <slot />
  </section>
</template>

<style scoped>
.chart-panel {
  display: grid;
  gap: 18px;
  min-width: 0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  padding: 20px;
}

.chart-panel--wide {
  grid-column: 1 / -1;
}

.chart-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.chart-panel h2 {
  margin: 0;
  color: #282036;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.chart-panel p {
  margin: 5px 0 0;
  color: #6c6a72;
  font-size: 13px;
  line-height: 1.45;
}
</style>
