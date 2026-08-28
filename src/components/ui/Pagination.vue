<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  from: number
  to: number
  pageCount: number
  noun?: string
  sizes?: number[]
}>(), { noun: 'rows', sizes: () => [10, 25, 50, 100] })

const emit = defineEmits<{ 'update:page': [number]; 'update:pageSize': [number] }>()

const go = (p: number) => { if (p >= 1 && p <= props.pageCount) emit('update:page', p) }

// Compact window of page numbers around the current page.
const pages = computed(() => {
  const n = props.pageCount, c = props.page
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const lo = Math.max(2, c - 1), hi = Math.min(n - 1, c + 1)
  if (lo > 2) out.push('…')
  for (let i = lo; i <= hi; i++) out.push(i)
  if (hi < n - 1) out.push('…')
  out.push(n)
  return out
})
</script>

<template>
  <div v-if="total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
    <div class="flex items-center gap-2 text-xs text-slate-500">
      <span>Showing <b class="font-semibold text-slate-700">{{ from }}–{{ to }}</b> of {{ total.toLocaleString() }} {{ noun }}</span>
      <span class="hidden sm:inline text-slate-300">·</span>
      <label class="hidden sm:inline-flex items-center gap-1.5">
        <span>Rows</span>
        <select :value="pageSize" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
          class="h-7 pl-2 pr-6 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none">
          <option v-for="s in sizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>

    <div class="flex items-center gap-1">
      <button @click="go(page - 1)" :disabled="page <= 1"
        class="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '…'" class="px-1.5 text-slate-400">…</span>
        <button v-else @click="go(p)"
          class="h-8 min-w-8 px-2 text-xs font-medium rounded-md border transition-colors"
          :class="p === page ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">{{ p }}</button>
      </template>
      <button @click="go(page + 1)" :disabled="page >= pageCount"
        class="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
    </div>
  </div>
</template>
