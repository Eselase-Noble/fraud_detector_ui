<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { getFraudStats, getTopUsers, getLocationRisk, getSignalFrequency } from '@/api/analytics'
import { getModelStats, type ModelStats } from '@/api/transactions'
import { getLearningMetrics, getLearningStatus, type LearningMetricsResponse, type LearningStatus } from '@/api/learning'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import LiveBadge from '@/components/LiveBadge.vue'
import type { FraudStats, TopUser, LocationRisk, SignalFrequency } from '@/types/fraud'

defineOptions({ name: 'DashboardView' })

const days = ref(30)
const loading = ref(true)
const stats = ref<FraudStats | null>(null)
const users = ref<TopUser[]>([])
const locations = ref<LocationRisk[]>([])
const signals = ref<SignalFrequency[]>([])
const model = ref<ModelStats | null>(null)
const learning = ref<LearningMetricsResponse | null>(null)
const streamStatus = ref<LearningStatus | null>(null)

const curveMax = computed(() => 1) // accuracy is already 0..1
const fmtPct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(1)}%`)

// ─── Real-time training feed (SSE) ───────────────────────────────────────────
interface LiveStep {
  n: number; source: string; subject: string | null
  amount: number | null; merchant_category: string | null; location: string | null
  label: number; predicted_proba: number; predicted_label: number
  correct: boolean; influence: number; rolling_accuracy: number | null
}
const liveMoney = (n: number | null) => (n === null || n === undefined ? '—' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const liveConnected = ref(false)
const liveSteps = ref<LiveStep[]>([])
const liveCount = ref(0)
const liveRollingAcc = ref<number | null>(null)
const liveFraudSeen = ref(0)
const liveAccSpark = ref<number[]>([])
let es: EventSource | null = null

const openLiveStream = () => {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  es = new EventSource(`${base}/learning/live`)
  es.onopen = () => { liveConnected.value = true }
  es.onerror = () => { liveConnected.value = false }
  es.onmessage = (ev) => {
    let d: LiveStep & { type?: string }
    try { d = JSON.parse(ev.data) } catch { return }
    if (d.type && d.type !== 'step') return           // ignore hello/keepalive
    liveCount.value = d.n
    liveRollingAcc.value = d.rolling_accuracy
    if (d.label === 1) liveFraudSeen.value++
    liveSteps.value.unshift(d)
    if (liveSteps.value.length > 18) liveSteps.value.pop()
    if (d.rolling_accuracy !== null) {
      liveAccSpark.value.push(d.rolling_accuracy)
      if (liveAccSpark.value.length > 60) liveAccSpark.value.shift()
    }
  }
}
onMounted(openLiveStream)
onUnmounted(() => { es?.close() })

// Feature weights sorted by absolute magnitude — the signals the model leans on most.
const topWeights = computed(() => {
  const w = model.value?.weights ?? {}
  return Object.entries(w)
    .filter(([, v]) => Math.abs(v) > 1e-6)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6)
})
const maxWeight = computed(() => Math.max(1e-6, ...topWeights.value.map(([, v]) => Math.abs(v))))
const prettyFeature = (k: string) =>
  k.replace(/_/g, ' ').replace(/\bgt\b/, '>').replace(/\b\w/g, (c) => c.toUpperCase())

const money = (n = 0) => `GHS ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n = 0) => `${(Number(n) * (Number(n) <= 1 ? 100 : 1)).toFixed(1)}%`

const load = async () => {
  if (!stats.value) loading.value = true   // skeleton only on first load
  try {
    const [s, u, l, sig, m, lm, ls] = await Promise.all([
      getFraudStats(days.value).catch(() => null),
      getTopUsers(8, days.value).catch(() => []),
      getLocationRisk(days.value).catch(() => []),
      getSignalFrequency(days.value).catch(() => []),
      getModelStats().catch(() => null),
      getLearningMetrics().catch(() => null),
      getLearningStatus().catch(() => null),
    ])
    stats.value = s
    users.value = u
    locations.value = l
    signals.value = sig
    model.value = m
    learning.value = lm
    streamStatus.value = ls
  } finally {
    loading.value = false
  }
}
// Live: refresh dashboard data every 5s (pauses when the tab is hidden).
const { lastUpdated } = useAutoRefresh(load, 5000)

const total = computed(() => stats.value?.total_transactions ?? 0)
const breakdown = computed(() => {
  const s = stats.value
  if (!s || !total.value) return [] as { label: string; n: number; cls: string }[]
  return [
    { label: 'Blocked', n: s.blocked, cls: 'bg-rose-500' },
    { label: 'Reviewed', n: s.reviewed, cls: 'bg-amber-400' },
    { label: 'Allowed', n: s.allowed, cls: 'bg-emerald-500' },
  ]
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-slate-900">Fraud overview</h2>
          <LiveBadge :last-updated="lastUpdated" />
        </div>
        <p class="text-sm text-slate-500">Organization-wide detection activity over the selected window.</p>
      </div>
      <select v-model.number="days" @change="load" class="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md">
        <option :value="7">Last 7 days</option>
        <option :value="30">Last 30 days</option>
        <option :value="90">Last 90 days</option>
        <option :value="365">Last year</option>
      </select>
    </div>

    <!-- Real-time training feed -->
    <div class="rounded-xl bg-slate-900 text-slate-100 border border-slate-800 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Live training feed</span>
          <span class="text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            :class="liveConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'">
            <span class="w-1.5 h-1.5 rounded-full" :class="liveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'" />
            {{ liveConnected ? 'Streaming' : 'Connecting…' }}
          </span>
        </div>
        <div class="flex items-center gap-4 text-xs">
          <span class="text-slate-400">learned <span class="text-slate-100 font-semibold tabular-nums">{{ liveCount.toLocaleString() }}</span></span>
          <span class="text-slate-400">fraud seen <span class="text-rose-400 font-semibold tabular-nums">{{ liveFraudSeen }}</span></span>
          <span class="text-slate-400">rolling acc <span class="text-emerald-400 font-semibold tabular-nums">{{ fmtPct(liveRollingAcc) }}</span></span>
        </div>
      </div>

      <!-- live rolling-accuracy sparkline -->
      <div class="flex items-end gap-px h-10 mb-3">
        <div v-for="(a, i) in liveAccSpark" :key="i" class="flex-1 rounded-t"
          :class="a >= 0.9 ? 'bg-emerald-500' : a >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'"
          :style="{ height: `${Math.max(4, a * 100)}%` }" />
        <div v-if="!liveAccSpark.length" class="text-2xs text-slate-500 self-center">waiting for the stream to flow…</div>
      </div>

      <!-- scrolling event rows -->
      <div class="font-mono text-2xs space-y-0.5 max-h-56 overflow-hidden">
        <div v-for="s in liveSteps" :key="s.n" class="flex items-center gap-2 py-0.5 border-b border-slate-800/50"
          :class="s.label === 1 ? 'bg-rose-500/5' : ''">
          <span class="text-slate-500 w-10 tabular-nums shrink-0">{{ s.n }}</span>
          <span class="w-24 truncate shrink-0" :class="s.source === 'public_dataset' ? 'text-sky-400' : 'text-fuchsia-400'">{{ s.source }}</span>
          <span class="w-20 shrink-0 text-right tabular-nums text-slate-200">{{ liveMoney(s.amount) }}</span>
          <span class="text-slate-400 w-24 truncate shrink-0">{{ s.location || '—' }}</span>
          <span class="text-slate-400 w-20 truncate shrink-0">{{ s.merchant_category || '—' }}</span>
          <span class="w-14 shrink-0 font-semibold" :class="s.label === 1 ? 'text-rose-400' : 'text-slate-500'">{{ s.label === 1 ? 'FRAUD' : 'legit' }}</span>
          <span class="text-slate-500 shrink-0">p={{ s.predicted_proba.toFixed(2) }}</span>
          <span class="shrink-0" :class="s.correct ? 'text-emerald-400' : 'text-rose-400'">{{ s.correct ? '✓' : '✗ miss' }}</span>
        </div>
        <div v-if="!liveSteps.length" class="text-slate-500 py-2">No events yet. Start a producer (e.g. stream_public_dataset.py) or submit feedback to see steps appear here.</div>
      </div>
      <p class="text-2xs text-slate-500 mt-2">Each row is one online-learning step as it happens — prediction made <em>before</em> training (prequential). Identities are already pseudonymized.</p>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Transactions</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1">{{ total.toLocaleString() }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Blocked</div>
        <div class="text-2xl font-semibold text-rose-600 mt-1">{{ (stats?.blocked ?? 0).toLocaleString() }}</div>
        <div class="text-xs text-slate-400 mt-0.5">fraud rate {{ pct(stats?.fraud_rate) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">In review</div>
        <div class="text-2xl font-semibold text-amber-600 mt-1">{{ (stats?.reviewed ?? 0).toLocaleString() }}</div>
        <div class="text-xs text-slate-400 mt-0.5">review rate {{ pct(stats?.review_rate) }}</div>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 p-4">
        <div class="text-2xs uppercase tracking-wide text-slate-400">Flagged amount</div>
        <div class="text-2xl font-semibold text-slate-900 mt-1">{{ money(stats?.total_flagged_amount) }}</div>
        <div class="text-xs text-slate-400 mt-0.5">avg {{ money(stats?.avg_flagged_amount) }}</div>
      </div>
    </div>

    <!-- Model learning (online-learning model) -->
    <div v-if="model" class="rounded-xl bg-white border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">Model learning</span>
          <span class="text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded"
            :class="model.is_trusted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
            {{ model.is_trusted ? 'Active' : 'Warming up' }}
          </span>
        </div>
        <span class="text-2xs text-slate-400">learns from analyst feedback</span>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Labels learned</div>
          <div class="text-2xl font-semibold text-slate-900 mt-1">{{ model.n_updates.toLocaleString() }}</div>
          <div class="text-xs text-slate-400 mt-0.5">{{ model.n_fraud_labels }} fraud · {{ model.n_legit_labels }} legit</div>
        </div>
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Score influence</div>
          <div class="text-2xl font-semibold text-indigo-600 mt-1">{{ Math.round(model.influence * 100) }}%</div>
          <div class="text-xs text-slate-400 mt-0.5">share of the blended score</div>
        </div>
        <div class="col-span-2 lg:col-span-2">
          <div class="text-2xs uppercase tracking-wide text-slate-400 mb-2">
            Top learned signals
            <span v-if="!model.is_trusted" class="normal-case tracking-normal text-slate-300">
              — needs {{ model.min_samples_to_trust }} labels to activate
            </span>
          </div>
          <div v-if="topWeights.length" class="space-y-1.5">
            <div v-for="[name, w] in topWeights" :key="name" class="flex items-center gap-2">
              <span class="text-xs text-slate-600 w-32 shrink-0 truncate" :title="prettyFeature(name)">{{ prettyFeature(name) }}</span>
              <div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full" :class="w >= 0 ? 'bg-rose-500' : 'bg-emerald-500'"
                  :style="{ width: `${(Math.abs(w) / maxWeight) * 100}%` }" />
              </div>
              <span class="text-2xs tabular-nums w-10 text-right" :class="w >= 0 ? 'text-rose-600' : 'text-emerald-600'">
                {{ w >= 0 ? '+' : '' }}{{ w.toFixed(2) }}
              </span>
            </div>
          </div>
          <div v-else class="text-xs text-slate-400">No feedback yet — confirm or clear cases to start training.</div>
        </div>
      </div>
      <p class="text-2xs text-slate-400 mt-3">
        Positive weight (red) pushes toward fraud, negative (green) toward legitimate. Updated live as analysts review cases.
      </p>
    </div>

    <!-- Learning stream (online-learning pipeline observability) -->
    <div v-if="learning" class="rounded-xl bg-white border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">Learning stream</span>
          <span v-if="streamStatus" class="text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            :class="streamStatus.consumer_running ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'">
            <span class="w-1.5 h-1.5 rounded-full" :class="streamStatus.consumer_running ? 'bg-emerald-500' : 'bg-rose-500'" />
            {{ streamStatus.consumer_running ? 'Consumer live' : 'Stopped' }}
          </span>
          <span v-if="streamStatus" class="text-2xs text-slate-400">via {{ streamStatus.broker }}</span>
        </div>
        <span v-if="streamStatus" class="text-2xs text-slate-400" :title="'Active PII key: ' + streamStatus.pepper_fingerprint">
          🔒 identities pseudonymized · key {{ streamStatus.pepper_fingerprint }}
        </span>
      </div>

      <!-- Prequential metric tiles -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Events learned</div>
          <div class="text-2xl font-semibold text-slate-900 mt-1">{{ learning.metrics.total_events.toLocaleString() }}</div>
          <div class="text-xs text-slate-400 mt-0.5">{{ learning.metrics.fraud_labels }} fraud in window</div>
        </div>
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Accuracy</div>
          <div class="text-2xl font-semibold text-emerald-600 mt-1">{{ fmtPct(learning.metrics.accuracy) }}</div>
          <div class="text-xs text-slate-400 mt-0.5">prequential</div>
        </div>
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Precision</div>
          <div class="text-2xl font-semibold text-slate-900 mt-1">{{ fmtPct(learning.metrics.precision) }}</div>
        </div>
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Recall</div>
          <div class="text-2xl font-semibold text-slate-900 mt-1">{{ fmtPct(learning.metrics.recall) }}</div>
        </div>
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400">Avg loss</div>
          <div class="text-2xl font-semibold text-slate-900 mt-1">{{ learning.metrics.avg_loss ?? '—' }}</div>
        </div>
      </div>

      <!-- Learning curve + sources -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div class="lg:col-span-2">
          <div class="text-2xs uppercase tracking-wide text-slate-400 mb-2">Learning curve — rolling accuracy (oldest → newest)</div>
          <div v-if="learning.curve.length" class="flex items-end gap-1 h-24">
            <div v-for="c in learning.curve" :key="c.bucket" class="flex-1 bg-indigo-100 rounded-t relative group"
              :style="{ height: `${((c.accuracy ?? 0) / curveMax) * 100}%` }" :title="`bucket ${c.bucket}: ${fmtPct(c.accuracy)} (${c.n})`">
              <div class="absolute inset-x-0 bottom-0 bg-indigo-500 rounded-t" :style="{ height: '100%' }" />
            </div>
          </div>
          <div v-else class="text-xs text-slate-400">No learning events yet.</div>
        </div>
        <div>
          <div class="text-2xs uppercase tracking-wide text-slate-400 mb-2">Feedback sources</div>
          <div class="space-y-2">
            <div v-for="s in learning.by_source" :key="s.source" class="flex items-center justify-between text-xs">
              <span class="text-slate-600">{{ s.source.replace(/_/g, ' ') }}</span>
              <span class="font-semibold text-slate-700 tabular-nums">{{ s.count.toLocaleString() }}</span>
            </div>
            <div v-if="!learning.by_source.length" class="text-xs text-slate-400">No sources yet.</div>
          </div>
          <div v-if="streamStatus" class="mt-3 pt-3 border-t border-slate-100 text-2xs text-slate-400 space-y-0.5">
            <div>consumed {{ streamStatus.consumed.toLocaleString() }} · learned {{ streamStatus.learned.toLocaleString() }}</div>
            <div v-if="streamStatus.pending !== undefined">backlog {{ streamStatus.pending }} pending</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Decision breakdown -->
    <div class="rounded-xl bg-white border border-slate-200 p-4">
      <div class="text-sm font-medium text-slate-700 mb-3">Decision breakdown</div>
      <div v-if="total" class="flex h-3 rounded-full overflow-hidden bg-slate-100">
        <div v-for="b in breakdown" :key="b.label" :class="b.cls" :style="{ width: `${(b.n / total) * 100}%` }" :title="`${b.label}: ${b.n}`" />
      </div>
      <div v-else class="text-sm text-slate-400 py-2">No transactions in this window.</div>
      <div class="flex flex-wrap gap-4 mt-3 text-xs">
        <span v-for="b in breakdown" :key="b.label" class="inline-flex items-center gap-1.5 text-slate-500">
          <span class="w-2.5 h-2.5 rounded-sm" :class="b.cls" /> {{ b.label }} · {{ b.n.toLocaleString() }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Top risky users -->
      <div class="rounded-xl bg-white border border-slate-200 overflow-hidden lg:col-span-2">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">Top risky users</div>
        <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[620px]">
          <thead>
            <tr class="text-2xs uppercase tracking-wide text-slate-400 bg-slate-50">
              <th class="text-left px-4 py-2 font-semibold">User</th>
              <th class="text-right px-4 py-2 font-semibold">Txns</th>
              <th class="text-right px-4 py-2 font-semibold">Blocked</th>
              <th class="text-right px-4 py-2 font-semibold">Amount</th>
              <th class="text-right px-4 py-2 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.user_id" class="border-t border-slate-50">
              <td class="px-4 py-2 font-medium text-slate-700">{{ u.user_id }}</td>
              <td class="px-4 py-2 text-right text-slate-600">{{ u.transaction_count }}</td>
              <td class="px-4 py-2 text-right text-rose-600">{{ u.blocked_count }}</td>
              <td class="px-4 py-2 text-right text-slate-600">{{ money(u.total_amount) }}</td>
              <td class="px-4 py-2 text-right"><span class="font-semibold" :class="u.risk_score > 0.6 ? 'text-rose-600' : u.risk_score > 0.3 ? 'text-amber-600' : 'text-slate-500'">{{ Math.round(Number(u.risk_score) * 100) }}%</span></td>
            </tr>
            <tr v-if="!users.length && !loading"><td colspan="5" class="px-4 py-6 text-center text-slate-400">No data.</td></tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Top signals -->
      <div class="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">Most frequent signals</div>
        <div class="p-4 space-y-2.5">
          <div v-for="s in signals.slice(0, 8)" :key="s.signal">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-slate-600 truncate pr-2">{{ s.signal }}</span>
              <span class="text-slate-400 shrink-0">{{ s.count }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full" :style="{ width: `${Math.min(100, Number(s.pct) * (Number(s.pct) <= 1 ? 100 : 1))}%` }" />
            </div>
          </div>
          <div v-if="!signals.length && !loading" class="text-sm text-slate-400">No signals.</div>
        </div>
      </div>
    </div>

    <!-- Top locations -->
    <div class="rounded-xl bg-white border border-slate-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">High-risk locations</div>
      <div class="p-4 flex flex-wrap gap-2">
        <span v-for="l in locations.slice(0, 12)" :key="l.location"
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
          :class="l.risk_score > 0.5 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'">
          <strong>{{ l.location || '—' }}</strong>
          <span class="text-slate-400">{{ l.blocked_count }}/{{ l.transaction_count }} blocked</span>
        </span>
        <span v-if="!locations.length && !loading" class="text-sm text-slate-400">No location data.</span>
      </div>
    </div>
  </div>
</template>
