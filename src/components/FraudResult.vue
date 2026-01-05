<script setup lang="ts">
import { computed } from "vue"
import type { FraudResult } from "@/types/fraud"
import { marked } from "marked"

const props = defineProps<{
  result: FraudResult
}>()

const decisionColor = computed(() => {
  switch (props.result.decision) {
    case "ALLOW":
      return "text-green-400 border-green-400/40 bg-green-400/10"
    case "REVIEW":
      return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
    case "BLOCK":
      return "text-red-400 border-red-400/40 bg-red-400/10"
    default:
      return "text-gray-400 border-white/10 bg-white/5"
  }
})

const scorePercent = computed(() =>
  Math.round(props.result.score * 100)
)

const formattedReason = computed(() =>
  marked.parse(props.result.reason)
)
</script>

<template>
  <div
    class="relative rounded-2xl border border-white/10 bg-white/5
           backdrop-blur p-8 md:p-10"
  >
    <!-- HEADER -->
    <div class="flex items-start justify-between gap-6">
      <div>
        <h2 class="text-2xl font-bold mb-1">
          Fraud Analysis Result
        </h2>
        <p class="text-sm text-gray-400">
          Transaction ID:
          <span class="font-mono text-gray-300">
            {{ result.transaction_id }}
          </span>
        </p>
      </div>

      <div
        class="rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-wide"
        :class="decisionColor"
      >
        {{ result.decision }}
      </div>
    </div>

    <!-- SCORE -->
    <div class="mt-8">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-400">Risk Score</span>
        <span class="text-sm font-semibold">
          {{ scorePercent }}%
        </span>
      </div>

      <div class="h-3 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="{
            'bg-green-400': result.score < 0.4,
            'bg-yellow-400': result.score >= 0.4 && result.score < 0.7,
            'bg-red-400': result.score >= 0.7
          }"
          :style="{ width: `${scorePercent}%` }"
        />
      </div>
    </div>

    <!-- REASON -->
    <div class="mt-8">
      <h3 class="text-sm font-semibold text-gray-300 mb-2">
        Decision Explanation
      </h3>

      <div
        class="rounded-xl border border-white/10 bg-black/40
           px-5 py-4 text-gray-300 leading-relaxed"
      >
        <div
          class="markdown prose prose-invert max-w-none text-gray-300"
          v-html="formattedReason"
        ></div>
      </div>
    </div>

    <!-- SIGNALS -->
    <div v-if="result.signals?.length" class="mt-8">
      <h3 class="text-sm font-semibold text-gray-300 mb-3">
        Risk Signals Detected
      </h3>

      <ul class="space-y-2">
        <li
          v-for="signal in result.signals"
          :key="signal"
          class="flex items-center gap-3 rounded-lg
                 border border-white/10 bg-black/40
                 px-4 py-3 text-sm text-gray-300"
        >
          <span class="text-red-400">⚠</span>
          {{ signal }}
        </li>
      </ul>
    </div>
  </div>
</template>


<style scoped>
.markdown :deep(h3) {
  @apply text-lg font-bold mt-6 mb-2;
}

.markdown :deep(h4) {
  @apply text-base font-semibold mt-4 mb-2;
}

.markdown :deep(ul) {
  @apply list-disc ml-6 space-y-2;
}

.markdown :deep(hr) {
  @apply my-6 border-white/10;
}
</style>
