<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'emerald' | 'amber' | 'rose' | 'indigo'
}>(), { tone: 'default', hint: '' })

const accent: Record<string, string> = {
  default: 'text-slate-900',
  emerald: 'text-emerald-600',
  amber:   'text-amber-600',
  rose:    'text-rose-600',
  indigo:  'text-indigo-600',
}
const bar: Record<string, string> = {
  default: 'bg-slate-200',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  indigo:  'bg-indigo-500',
}
</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-white border border-slate-200 px-4 py-3.5">
    <span class="absolute left-0 top-0 h-full w-1" :class="bar[tone]" />
    <div class="text-[11px] font-medium uppercase tracking-wide text-slate-400">{{ label }}</div>
    <div class="mt-1 text-2xl font-semibold tabular-nums" :class="accent[tone]">{{ value }}</div>
    <div v-if="hint" class="mt-0.5 text-xs text-slate-400">{{ hint }}</div>
  </div>
</template>
