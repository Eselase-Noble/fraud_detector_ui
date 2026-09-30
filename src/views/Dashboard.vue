<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { getFraudStats, getTopUsers, getLocationRisk, getSignalFrequency } from '@/api/analytics'
import { getModelStats, type ModelStats } from '@/api/transactions'
import type { FraudStats, TopUser, LocationRisk, SignalFrequency } from '@/types/fraud'

defineOptions({ name: 'DashboardView' })

const days = ref(30)
const loading = ref(true)
const stats = ref<FraudStats | null>(null)
const users = ref<TopUser[]>([])
const locations = ref<LocationRisk[]>([])
const signals = ref<SignalFrequency[]>([])
const model = ref<ModelStats | null>(null)

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
  loading.value = true
  try {
    const [s, u, l, sig, m] = await Promise.all([
      getFraudStats(days.value).catch(() => null),
      getTopUsers(8, days.value).catch(() => []),
      getLocationRisk(days.value).catch(() => []),
      getSignalFrequency(days.value).catch(() => []),
      getModelStats().catch(() => null),
    ])
    stats.value = s
    users.value = u
    locations.value = l
    signals.value = sig
    model.value = m
  } finally {
    loading.value = false
  }
}
onMounted(load)

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
        <h2 class="text-lg font-semibold text-slate-900">Fraud overview</h2>
        <p class="text-sm text-slate-500">Organization-wide detection activity over the selected window.</p>
      </div>
      <select v-model.number="days" @change="load" class="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md">
        <option :value="7">Last 7 days</option>
        <option :value="30">Last 30 days</option>
        <option :value="90">Last 90 days</option>
        <option :value="365">Last year</option>
      </select>
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
