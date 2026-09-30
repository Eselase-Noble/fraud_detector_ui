<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getLearningMetrics, type LearningMetricsResponse } from '@/api/learning'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import LineChart from '@/components/LineChart.vue'

defineOptions({ name: 'LearningLiveView' })

// ─── Prequential metrics (polled) ────────────────────────────────────────────
const data = ref<LearningMetricsResponse | null>(null)
const seeded = ref(false)
const load = async () => {
  data.value = await getLearningMetrics(undefined, 24)
  // Seed the live view from server history so it reflects the ONGOING stream on
  // open, instead of appearing to start from zero. Training itself never stopped.
  if (!seeded.value && data.value) {
    if (data.value.curve.length) spark.value = data.value.curve.map((c) => c.accuracy ?? 0)
    count.value = data.value.metrics.total_events
    fraudSeen.value = data.value.metrics.fraud_labels
    seeded.value = true
  }
}
const { lastUpdated } = useAutoRefresh(load, 4000)

const fmtPct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(1)}%`)

// ─── Real-time step feed (SSE) ───────────────────────────────────────────────
interface LiveStep {
  n: number; source: string; subject: string | null
  amount: number | null; currency?: string | null; merchant_category: string | null; location: string | null
  label: number; predicted_proba: number; predicted_label: number
  correct: boolean; influence: number; rolling_accuracy: number | null
  why?: { feature: string; contribution: number }[]
}
const money = (n: number | null, c = 'GHS') => (n === null || n === undefined ? '—' : `${c} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const prettyFeat = (k: string) => k.replace(/_/g, ' ').replace(/\bgt\b/, '>')

// Global explainability: the model's learned feature weights, biggest first.
const topWeights = computed<[string, number][]>(() => {
  const w = data.value?.model.weights ?? {}
  return (Object.entries(w) as [string, number][])
    .filter(([, v]) => Math.abs(v) > 1e-6)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
})
const maxWeight = computed(() => Math.max(1e-6, ...topWeights.value.map(([, v]) => Math.abs(v))))
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
      <div class="rounded-xl bg-white border border-slate-200 p-4" title="Share of predictions that were correct">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Accuracy</div>
        <div class="text-2xl font-semibold text-emerald-600 mt-1 tabular-nums">{{ fmtPct(data?.metrics.accuracy) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4" title="Of flagged-as-fraud, how many truly were">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Precision</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{{ fmtPct(data?.metrics.precision) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4" title="Of true frauds, how many were caught">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Recall</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{{ fmtPct(data?.metrics.recall) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4" title="Harmonic mean of precision and recall">
        <div class="text-2xs uppercase tracking-wide text-slate-400">F1</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{{ fmtPct(data?.metrics.f1) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4" title="Ranking quality across all thresholds (0.5 = random, 1 = perfect)">
        <div class="text-2xs uppercase tracking-wide text-slate-400">ROC-AUC</div>
        <div class="text-2xl font-semibold text-indigo-600 mt-1 tabular-nums">{{ data?.metrics.auc?.toFixed(3) ?? '—' }}</div>
      </div>
    </div>

    <!-- Secondary metrics + confusion matrix -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400 mb-3">Additional metrics (window of {{ data?.metrics.window?.toLocaleString() }})</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
          <div><div class="text-2xs text-slate-400">Specificity (TNR)</div><div class="font-semibold text-slate-800">{{ fmtPct(data?.metrics.specificity) }}</div></div>
          <div><div class="text-2xs text-slate-400">Balanced accuracy</div><div class="font-semibold text-slate-800">{{ fmtPct(data?.metrics.balanced_accuracy) }}</div></div>
          <div><div class="text-2xs text-slate-400">MCC</div><div class="font-semibold text-slate-800">{{ data?.metrics.mcc?.toFixed(3) ?? '—' }}</div></div>
          <div><div class="text-2xs text-slate-400">Fraud rate (window)</div><div class="font-semibold text-slate-800">{{ fmtPct(data?.metrics.fraud_rate) }}</div></div>
          <div><div class="text-2xs text-slate-400">Avg log-loss</div><div class="font-semibold text-slate-800">{{ data?.metrics.avg_loss ?? '—' }}</div></div>
          <div><div class="text-2xs text-slate-400">Model influence</div><div class="font-semibold text-indigo-600">{{ Math.round((data?.model.influence ?? 0) * 100) }}%</div></div>
        </div>
        <div v-if="data?.metrics.notes?.length" class="mt-3 pt-3 border-t border-slate-100 space-y-1">
          <div v-for="(note, i) in data.metrics.notes" :key="i" class="text-2xs text-amber-700 bg-amber-50 rounded px-2 py-1">ⓘ {{ note }}</div>
        </div>
      </div>

      <!-- Confusion matrix -->
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400 mb-3">Confusion matrix</div>
        <div class="grid grid-cols-2 gap-1.5 text-center">
          <div class="rounded-lg bg-emerald-50 py-2">
            <div class="text-lg font-semibold text-emerald-700 tabular-nums">{{ data?.metrics.confusion.tp ?? 0 }}</div>
            <div class="text-2xs text-emerald-600">true fraud ✓</div>
          </div>
          <div class="rounded-lg bg-rose-50 py-2">
            <div class="text-lg font-semibold text-rose-700 tabular-nums">{{ data?.metrics.confusion.fn ?? 0 }}</div>
            <div class="text-2xs text-rose-600">missed fraud</div>
          </div>
          <div class="rounded-lg bg-amber-50 py-2">
            <div class="text-lg font-semibold text-amber-700 tabular-nums">{{ data?.metrics.confusion.fp ?? 0 }}</div>
            <div class="text-2xs text-amber-600">false alarm</div>
          </div>
          <div class="rounded-lg bg-slate-50 py-2">
            <div class="text-lg font-semibold text-slate-700 tabular-nums">{{ data?.metrics.confusion.tn ?? 0 }}</div>
            <div class="text-2xs text-slate-500">true legit ✓</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Explainable AI: global feature importance -->
    <div class="rounded-xl bg-white border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-slate-700">Explainable AI — what drives the model</span>
        <span class="text-2xs text-slate-400">weight × signal · red pushes toward fraud, green toward legit</span>
      </div>
      <div v-if="topWeights.length" class="space-y-1.5">
        <div v-for="[name, w] in topWeights" :key="name" class="flex items-center gap-2">
          <span class="text-xs text-slate-600 w-40 shrink-0 truncate" :title="prettyFeat(name)">{{ prettyFeat(name) }}</span>
          <div class="flex-1 flex items-center">
            <div class="w-1/2 flex justify-end">
              <div v-if="w < 0" class="h-2 bg-emerald-500 rounded-l" :style="{ width: `${(Math.abs(w) / maxWeight) * 100}%` }" />
            </div>
            <div class="w-px h-4 bg-slate-300" />
            <div class="w-1/2">
              <div v-if="w >= 0" class="h-2 bg-rose-500 rounded-r" :style="{ width: `${(Math.abs(w) / maxWeight) * 100}%` }" />
            </div>
          </div>
          <span class="text-2xs tabular-nums w-12 text-right" :class="w >= 0 ? 'text-rose-600' : 'text-emerald-600'">{{ w >= 0 ? '+' : '' }}{{ w.toFixed(2) }}</span>
        </div>
      </div>
      <div v-else class="text-xs text-slate-400">No learned weights yet.</div>
    </div>

    <!-- Live learning curve (line graph) -->
    <div class="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-slate-100">Learning curve — rolling accuracy (live)</span>
        <span class="text-2xs text-slate-500 tabular-nums">{{ spark.length }} pts · latest {{ fmtPct(spark[spark.length - 1] ?? null) }}</span>
      </div>
      <LineChart :values="spark" :min="0" :max="1" :height="150" stroke="#34d399" fill="rgba(52,211,153,0.12)" />
      <div class="flex justify-between text-2xs text-slate-500 mt-1"><span>0%</span><span>accuracy</span><span>100%</span></div>
    </div>

    <!-- Live step feed — full width so every column fits -->
    <div class="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-medium text-slate-100">Live data &amp; predictions</span>
        <span class="text-2xs text-slate-500">prediction made before training (prequential) · {{ steps.length }} shown</span>
      </div>
      <div v-if="data?.fx" class="px-4 py-1.5 bg-slate-950/50 border-b border-slate-800 text-2xs text-slate-400 flex flex-wrap items-center gap-x-2">
        <span class="text-emerald-400">💱 Amounts in GHS</span>
        <span class="text-slate-600">·</span>
        <span>1 {{ data.fx.base }} = <span class="text-slate-200 font-semibold">{{ data.fx.rate }}</span> {{ data.fx.quote }}</span>
        <span class="text-slate-600">·</span>
        <span>source: <a v-if="data.fx.source?.startsWith('http')" :href="data.fx.source" target="_blank" rel="noopener" class="text-sky-400 hover:underline">{{ data.fx.source.replace(/^https?:\/\//, '') }}</a><span v-else>{{ data.fx.source }}</span></span>
        <span v-if="data.fx.as_of" class="text-slate-600">·</span>
        <span v-if="data.fx.as_of">as of {{ data.fx.as_of }}</span>
      </div>
      <div class="max-h-[30rem] overflow-auto">
        <table class="w-full font-mono text-2xs border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="text-slate-500 bg-slate-950/90 backdrop-blur text-left">
              <th class="font-normal px-3 py-2 w-14">#</th>
              <th class="font-normal px-3 py-2">source</th>
              <th class="font-normal px-3 py-2">subject</th>
              <th class="font-normal px-3 py-2 text-right whitespace-nowrap">amount</th>
              <th class="font-normal px-3 py-2">location</th>
              <th class="font-normal px-3 py-2">category</th>
              <th class="font-normal px-3 py-2">truth</th>
              <th class="font-normal px-3 py-2 text-right">model&nbsp;p</th>
              <th class="font-normal px-3 py-2 text-center">result</th>
              <th class="font-normal px-3 py-2">why (top drivers)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in steps" :key="s.n" class="border-t border-slate-800/40 hover:bg-slate-800/30"
              :class="s.label === 1 ? 'bg-rose-500/5' : ''">
              <td class="px-3 py-1.5 text-slate-500 tabular-nums">{{ s.n }}</td>
              <td class="px-3 py-1.5 whitespace-nowrap" :class="s.source === 'public_dataset' ? 'text-sky-400' : 'text-fuchsia-400'">{{ s.source }}</td>
              <td class="px-3 py-1.5 text-slate-400 whitespace-nowrap">{{ s.subject || '—' }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums text-slate-200 whitespace-nowrap">{{ money(s.amount, s.currency || 'GHS') }}</td>
              <td class="px-3 py-1.5 text-slate-400 whitespace-nowrap">{{ s.location || '—' }}</td>
              <td class="px-3 py-1.5 text-slate-400 whitespace-nowrap">{{ s.merchant_category || '—' }}</td>
              <td class="px-3 py-1.5 font-semibold whitespace-nowrap" :class="s.label === 1 ? 'text-rose-400' : 'text-slate-500'">{{ s.label === 1 ? 'FRAUD' : 'legit' }}</td>
              <td class="px-3 py-1.5 text-right text-slate-500 tabular-nums">{{ s.predicted_proba.toFixed(2) }}</td>
              <td class="px-3 py-1.5 text-center" :class="s.correct ? 'text-emerald-400' : 'text-rose-400'">{{ s.correct ? '✓' : '✗' }}</td>
              <td class="px-3 py-1.5 text-slate-400 whitespace-nowrap">
                <template v-for="(w, i) in (s.why || []).slice(0, 3)" :key="i">
                  <span :class="w.contribution >= 0 ? 'text-rose-300' : 'text-emerald-300'">{{ prettyFeat(w.feature) }}</span><span v-if="i < Math.min(2, (s.why || []).length - 1)" class="text-slate-600">, </span>
                </template>
                <span v-if="!s.why?.length">—</span>
              </td>
            </tr>
            <tr v-if="!steps.length"><td colspan="10" class="text-slate-500 px-4 py-6 text-center">No events yet. Start a producer or submit feedback.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sources + learning curve -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <LineChart v-if="data?.curve.length" :values="data.curve.map((c) => c.accuracy ?? 0)" :min="0" :max="1" :height="80" stroke="#6366f1" fill="rgba(99,102,241,0.12)" />
        <div v-else class="text-xs text-slate-400">No data yet.</div>
      </div>
    </div>
  </div>
</template>
