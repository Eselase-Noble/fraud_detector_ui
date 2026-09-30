<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { getLearningMetrics, type LearningMetricsResponse } from '@/api/learning'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'

defineOptions({ name: 'LearningLiveView' })

// ─── Prequential metrics (polled) ────────────────────────────────────────────
const data = ref<LearningMetricsResponse | null>(null)
const load = async () => { data.value = await getLearningMetrics(undefined, 24) }
const { lastUpdated } = useAutoRefresh(load, 4000)

const fmtPct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(1)}%`)

// ─── Real-time step feed (SSE) ───────────────────────────────────────────────
interface LiveStep {
  n: number; source: string; subject: string | null
  amount: number | null; merchant_category: string | null; location: string | null
  label: number; predicted_proba: number; predicted_label: number
  correct: boolean; influence: number; rolling_accuracy: number | null
}
const money = (n: number | null) => (n === null || n === undefined ? '—' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const connected = ref(false)
const steps = ref<LiveStep[]>([])
const count = ref(0)
const fraudSeen = ref(0)
const spark = ref<number[]>([])
const throughput = ref(0)
let recentTimes: number[] = []
let es: EventSource | null = null

const openStream = () => {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  es = new EventSource(`${base}/learning/live`)
  es.onopen = () => { connected.value = true }
  es.onerror = () => { connected.value = false }
  es.onmessage = (ev) => {
    let d: LiveStep & { type?: string }
    try { d = JSON.parse(ev.data) } catch { return }
    if (d.type && d.type !== 'step') return
    count.value = d.n
    if (d.label === 1) fraudSeen.value++
    steps.value.unshift(d)
    if (steps.value.length > 60) steps.value.pop()
    if (d.rolling_accuracy !== null) {
      spark.value.push(d.rolling_accuracy)
      if (spark.value.length > 120) spark.value.shift()
    }
    const now = Date.now()
    recentTimes.push(now)
    recentTimes = recentTimes.filter((t) => now - t < 5000)
    throughput.value = Math.round((recentTimes.length / 5) * 10) / 10
  }
}
onMounted(openStream)
onUnmounted(() => { es?.close() })
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-slate-900">Live training</h2>
          <LiveBadge :last-updated="lastUpdated" label="Metrics" />
        </div>
        <p class="text-sm text-slate-500">The model learning in real time — every step streamed as it happens, identities pseudonymized.</p>
      </div>
      <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
        :class="connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
        <span class="w-1.5 h-1.5 rounded-full" :class="connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'" />
        {{ connected ? 'Stream connected' : 'Connecting…' }} · {{ throughput }}/s
      </span>
    </div>

    <!-- Metric tiles -->
    <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Steps</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{{ (data?.metrics.total_events ?? count).toLocaleString() }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Accuracy</div>
        <div class="text-2xl font-semibold text-emerald-600 mt-1 tabular-nums">{{ fmtPct(data?.metrics.accuracy) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Precision</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{{ fmtPct(data?.metrics.precision) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Recall</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{{ fmtPct(data?.metrics.recall) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Model influence</div>
        <div class="text-2xl font-semibold text-indigo-600 mt-1 tabular-nums">{{ Math.round((data?.model.influence ?? 0) * 100) }}%</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Fraud seen</div>
        <div class="text-2xl font-semibold text-rose-600 mt-1 tabular-nums">{{ fraudSeen || (data?.metrics.fraud_labels ?? 0) }}</div>
      </div>
    </div>

    <!-- Live rolling-accuracy chart -->
    <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <div class="text-sm font-medium text-slate-100 mb-3">Rolling accuracy — live</div>
      <div class="flex items-end gap-px h-32">
        <div v-for="(a, i) in spark" :key="i" class="flex-1 rounded-t transition-all"
          :class="a >= 0.9 ? 'bg-emerald-500' : a >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'"
          :style="{ height: `${Math.max(3, a * 100)}%` }" />
        <div v-if="!spark.length" class="text-2xs text-slate-500 self-center">waiting for the stream to flow…</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Live step feed -->
      <div class="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-800 text-sm font-medium text-slate-100 flex items-center justify-between">
          <span>Live data &amp; predictions</span>
          <span class="text-2xs text-slate-500">prediction made before training (prequential)</span>
        </div>
        <!-- column header -->
        <div class="font-mono text-2xs px-4 py-1.5 flex items-center gap-2 text-slate-500 bg-slate-950/40 border-b border-slate-800">
          <span class="w-12 shrink-0">#</span>
          <span class="w-24 shrink-0">source</span>
          <span class="w-24 shrink-0">subject</span>
          <span class="w-20 shrink-0 text-right">amount</span>
          <span class="w-24 shrink-0">location</span>
          <span class="w-20 shrink-0">category</span>
          <span class="w-12 shrink-0">truth</span>
          <span class="w-14 shrink-0">model p</span>
          <span class="shrink-0">result</span>
        </div>
        <div class="font-mono text-2xs max-h-[26rem] overflow-y-auto">
          <div v-for="s in steps" :key="s.n" class="flex items-center gap-2 px-4 py-1 border-b border-slate-800/40"
            :class="s.label === 1 ? 'bg-rose-500/5' : ''">
            <span class="text-slate-500 w-12 tabular-nums shrink-0">{{ s.n }}</span>
            <span class="w-24 truncate shrink-0" :class="s.source === 'public_dataset' ? 'text-sky-400' : 'text-fuchsia-400'">{{ s.source }}</span>
            <span class="text-slate-400 w-24 truncate shrink-0">{{ s.subject || '—' }}</span>
            <span class="w-20 shrink-0 text-right tabular-nums text-slate-200">{{ money(s.amount) }}</span>
            <span class="w-24 truncate shrink-0 text-slate-400">{{ s.location || '—' }}</span>
            <span class="w-20 truncate shrink-0 text-slate-400">{{ s.merchant_category || '—' }}</span>
            <span class="w-12 shrink-0 font-semibold" :class="s.label === 1 ? 'text-rose-400' : 'text-slate-500'">{{ s.label === 1 ? 'FRAUD' : 'legit' }}</span>
            <span class="w-14 shrink-0 text-slate-500">{{ s.predicted_proba.toFixed(2) }}</span>
            <span class="shrink-0" :class="s.correct ? 'text-emerald-400' : 'text-rose-400'">{{ s.correct ? '✓' : '✗ miss' }}</span>
          </div>
          <div v-if="!steps.length" class="text-slate-500 px-4 py-6">No events yet. Start a producer or submit feedback.</div>
        </div>
      </div>

      <!-- Sources + learning curve -->
      <div class="space-y-4">
        <div class="rounded-xl bg-white border border-slate-200 p-4">
          <div class="text-2xs uppercase tracking-wide text-slate-400 mb-2">Feedback sources</div>
          <div class="space-y-2">
            <div v-for="s in data?.by_source ?? []" :key="s.source" class="flex items-center justify-between text-xs">
              <span class="text-slate-600">{{ s.source.replace(/_/g, ' ') }}</span>
              <span class="font-semibold text-slate-700 tabular-nums">{{ s.count.toLocaleString() }}</span>
            </div>
            <div v-if="!(data?.by_source?.length)" class="text-xs text-slate-400">No sources yet.</div>
          </div>
        </div>
        <div class="rounded-xl bg-white border border-slate-200 p-4">
          <div class="text-2xs uppercase tracking-wide text-slate-400 mb-2">Learning curve (oldest → newest)</div>
          <div v-if="data?.curve.length" class="flex items-end gap-0.5 h-20">
            <div v-for="c in data.curve" :key="c.bucket" class="flex-1 bg-indigo-500 rounded-t"
              :style="{ height: `${((c.accuracy ?? 0)) * 100}%` }" :title="`${fmtPct(c.accuracy)} (${c.n})`" />
          </div>
          <div v-else class="text-xs text-slate-400">No data yet.</div>
        </div>
      </div>
    </div>
  </div>
</template>
