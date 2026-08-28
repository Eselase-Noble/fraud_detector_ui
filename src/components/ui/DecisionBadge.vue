<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ decision?: string | null; size?: 'sm' | 'md' }>(), {
  decision: '',
  size: 'sm',
})

// One palette for decisions, used everywhere so the console reads consistently.
const map: Record<string, string> = {
  ALLOW:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REVIEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  BLOCK:  'bg-rose-50 text-rose-700 ring-rose-600/20',
}
const cls = computed(() => map[(props.decision || '').toUpperCase()] || 'bg-slate-100 text-slate-600 ring-slate-500/20')
const label = computed(() => (props.decision || '—').toUpperCase())
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset"
    :class="[cls, size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]']"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
    {{ label }}
  </span>
</template>
