<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ lastUpdated: Date | null; label?: string }>()
const now = ref(Date.now())
let t: ReturnType<typeof setInterval> | null = null
onMounted(() => { t = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (t) clearInterval(t) })

const ago = computed(() => {
  if (!props.lastUpdated) return 'syncing…'
  const s = Math.max(0, Math.round((now.value - props.lastUpdated.getTime()) / 1000))
  return s < 2 ? 'just now' : `${s}s ago`
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs text-slate-500">
    <span class="relative flex h-2 w-2">
      <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
    <span>{{ label || 'Live' }} · {{ ago }}</span>
  </span>
</template>
