<script setup lang="ts">
import { computed } from 'vue'

/**
 * Lightweight responsive SVG line chart for a live series (0..1 by default).
 * Re-renders reactively as `values` grows, so it animates as new points arrive.
 */
const props = withDefaults(defineProps<{
  values: number[]
  min?: number
  max?: number
  height?: number
  stroke?: string
  fill?: string
}>(), { min: 0, max: 1, height: 128, stroke: '#34d399', fill: 'rgba(52,211,153,0.14)' })

const W = 100 // viewBox width units (x); y is 0..100 too
const pts = computed(() => {
  const vs = props.values
  if (vs.length === 0) return []
  const span = Math.max(1e-9, props.max - props.min)
  const n = vs.length
  return vs.map((v, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * W
    const y = 100 - ((Math.min(props.max, Math.max(props.min, v)) - props.min) / span) * 100
    return [x, y] as const
  })
})
const linePath = computed(() => pts.value.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' '))
const areaPath = computed(() => {
  const p = pts.value
  if (!p.length) return ''
  const first = p[0]!, last = p[p.length - 1]!
  return `M${first[0].toFixed(2)},100 L${first[0].toFixed(2)},${first[1].toFixed(2)} `
    + p.slice(1).map((q) => `L${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ')
    + ` L${last[0].toFixed(2)},100 Z`
})
const lastPt = computed(() => pts.value[pts.value.length - 1] ?? null)
</script>

<template>
  <div class="w-full" :style="{ height: height + 'px' }">
    <svg v-if="pts.length" viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
      <!-- gridlines at 50% / 100% -->
      <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(148,163,184,0.15)" stroke-width="0.3" vector-effect="non-scaling-stroke" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(148,163,184,0.1)" stroke-width="0.3" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
      <path :d="areaPath" :fill="fill" stroke="none" />
      <path :d="linePath" :stroke="stroke" stroke-width="1.5" fill="none"
        vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-if="lastPt" :cx="lastPt[0]" :cy="lastPt[1]" r="1.6" :fill="stroke" vector-effect="non-scaling-stroke" />
    </svg>
    <div v-else class="w-full h-full grid place-items-center text-2xs text-slate-500">waiting for the stream to flow…</div>
  </div>
</template>
