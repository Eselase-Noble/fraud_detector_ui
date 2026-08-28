<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <section class="rounded-xl bg-white border border-slate-200 overflow-hidden">
    <header v-if="title || $slots.actions" class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
      <div>
        <h3 v-if="title" class="text-sm font-semibold text-slate-800">{{ title }}</h3>
        <p v-if="subtitle" class="text-xs text-slate-400 mt-0.5">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions"><slot name="actions" /></div>
    </header>
    <div :class="$slots.flush ? '' : 'p-4'"><slot /></div>
  </section>
</template>
