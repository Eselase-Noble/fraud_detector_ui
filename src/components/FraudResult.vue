<!--FraudResult.vue-->
<script setup lang="ts">
import { computed } from 'vue'
import type { FraudResult } from '@/types/fraud'
import { marked } from 'marked'

const props = defineProps<{ result: FraudResult }>()

const decisionConfig = computed(() => {
  const map = {
    ALLOW:  { text: 'text-green-400',  border: 'border-green-400/40',  bg: 'bg-green-400/10',  glow: 'shadow-[0_0_30px_-10px_rgba(74,222,128,0.4)]',  icon: '✓' },
    REVIEW: { text: 'text-yellow-400', border: 'border-yellow-400/40', bg: 'bg-yellow-400/10', glow: 'shadow-[0_0_30px_-10px_rgba(250,204,21,0.4)]',  icon: '⚑' },
    BLOCK:  { text: 'text-red-400',    border: 'border-red-400/40',    bg: 'bg-red-400/10',    glow: 'shadow-[0_0_30px_-10px_rgba(248,113,113,0.4)]', icon: '⛔' },
  }
  return map[props.result.decision] ?? { text: 'text-gray-400', border: 'border-white/10', bg: 'bg-white/5', glow: '', icon: '?' }
})

const scorePercent = computed(() => Math.round(props.result.score * 100))

const scoreBarColor = computed(() => {
  if (props.result.score < 0.4) return 'bg-green-400'
  if (props.result.score < 0.75) return 'bg-yellow-400'
  return 'bg-red-400'
})

const formattedReason = computed(() => marked.parse(props.result.reason) as string)

const formattedDate = computed(() => {
  if (!props.result.processed_at) return null
  return new Date(props.result.processed_at).toLocaleString()
})
</script>

<template>
  <div
    class="relative rounded-2xl border border-white/10 bg-white/5
           backdrop-blur p-8 md:p-10 transition-all"
    :class="decisionConfig.glow"
  >

    <!-- TOP BAR: ID + Decision Badge -->
    <div class="flex items-start justify-between gap-6 flex-wrap">
      <div>
        <h2 class="text-2xl font-bold mb-1">Fraud Analysis Result</h2>
        <p class="text-sm text-gray-400">
          Transaction:
          <span class="font-mono text-gray-300">{{ result.transaction_id }}</span>
        </p>
        <p v-if="formattedDate" class="text-xs text-gray-600 mt-1">
          Processed {{ formattedDate }}
        </p>
      </div>

      <div
        class="flex items-center gap-2 rounded-full border px-5 py-2
               text-sm font-semibold uppercase tracking-wide"
        :class="[decisionConfig.text, decisionConfig.border, decisionConfig.bg]"
      >
        {{ decisionConfig.icon }} {{ result.decision }}
      </div>
    </div>

    <!-- SCORE BAR -->
    <div class="mt-8">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-400">Risk Score</span>
        <span
          class="text-sm font-bold tabular-nums"
          :class="decisionConfig.text"
        >{{ scorePercent }}%</span>
      </div>
      <div class="h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="scoreBarColor"
          :style="{ width: `${scorePercent}%` }"
        />
      </div>
      <div class="flex justify-between text-xs text-gray-600 mt-1.5">
        <span>Low risk</span>
        <span>High risk</span>
      </div>
    </div>

    <!-- SIGNALS -->
    <div v-if="result.signals?.length" class="mt-8">
      <h3 class="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
        Risk Signals Detected
      </h3>
      <ul class="space-y-2">
        <li
          v-for="signal in result.signals"
          :key="signal"
          class="flex items-center gap-3 rounded-lg
                 border border-white/10 bg-black/40 px-4 py-3
                 text-sm text-gray-300"
        >
          <span class="text-red-400 shrink-0">⚠</span>
          {{ signal }}
        </li>
      </ul>
    </div>

    <!-- REASON / LLM EXPLANATION -->
    <div class="mt-8">
      <h3 class="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
        AI Decision Explanation
      </h3>
      <div
        class="rounded-xl border border-white/10 bg-black/40 px-6 py-5
               text-gray-300 leading-relaxed"
      >
        <div
          class="markdown prose prose-invert max-w-none text-gray-300 text-sm"
          v-html="formattedReason"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.markdown :deep(h3) { @apply text-base font-bold mt-5 mb-2 text-white; }
.markdown :deep(h4) { @apply text-sm font-semibold mt-4 mb-1 text-gray-200; }
.markdown :deep(p)  { @apply mb-3; }
.markdown :deep(ul) { @apply list-disc ml-5 space-y-1.5 mb-3; }
.markdown :deep(strong) { @apply text-white font-semibold; }
.markdown :deep(hr) { @apply my-5 border-white/10; }
</style>
