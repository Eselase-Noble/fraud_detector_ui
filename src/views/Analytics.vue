<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getFraudStats, getTimeSeries, getTopUsers, getLocationRisk, getSignalFrequency } from '@/api/analytics'
import type { FraudStats, TimeSeries, TopUser, LocationRisk, SignalFrequency } from '@/types/fraud'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatCard from '@/components/ui/StatCard.vue'

defineOptions({ name: 'AnalyticsView' })

const RANGES = [7, 30, 90] as const
const days = ref<number>(30)
const loading = ref(true)
const error = ref('')

const stats = ref<FraudStats | null>(null)
const series = ref<TimeSeries[]>([])
const users = ref<TopUser[]>([])
const locations = ref<LocationRisk[]>([])
const signals = ref<SignalFrequency[]>([])

const load = async () => {
  loading.value = true; error.value = ''
  try {
    const [s, ts, tu, lr, sf] = await Promise.all([
      getFraudStats(days.value).catch(() => null),
      getTimeSeries(days.value).catch(() => []),
      getTopUsers(8, days.value).catch(() => []),
      getLocationRisk(days.value).catch(() => []),
      getSignalFrequency(days.value).catch(() => []),
    ])
    stats.value = s; series.value = ts; users.value = tu; locations.value = lr; signals.value = sf
    if (!s && !ts.length) error.value = 'No analytics available yet — run some detections first.'
  } catch { error.value = 'Could not load analytics.' } finally { loading.value = false }
}
onMounted(load)
const setRange = (d: number) => { days.value = d; load() }

const pct = (n = 0) => `${(n * 100).toFixed(1)}%`
const money = (n = 0) => `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const maxTotal = computed(() => Math.max(1, ...series.value.map(d => d.total)))
const riskTone = (s = 0) => (s >= 0.66 ? 'rose' : s >= 0.33 ? 'amber' : 'emerald')
const toneBg: Record<string, string> = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }
const toneText: Record<string, string> = { rose: 'text-rose-600', amber: 'text-amber-600', emerald: 'text-emerald-600' }
const shortDate = (s: string) => { try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return s } }
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Analytics</h2>
        <p class="text-sm text-slate-500">Fraud trends, risk concentration and the signals driving decisions.</p>
      </div>
      <div class="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        <button v-for="d in RANGES" :key="d" @click="setRange(d)"
          class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
          :class="days === d ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'">
          {{ d }}d
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">
      <div class="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <div class="mt-3">Loading analytics…</div>
    </div>
    <div v-else-if="error" class="py-16 text-center text-sm text-slate-500">{{ error }}</div>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Transactions" :value="(stats?.total_transactions ?? 0).toLocaleString()" tone="indigo" :hint="`last ${days} days`" />
        <StatCard label="Blocked" :value="stats?.blocked ?? 0" tone="rose" :hint="`fraud rate ${pct(stats?.fraud_rate)}`" />
        <StatCard label="Under review" :value="stats?.reviewed ?? 0" tone="amber" :hint="`review rate ${pct(stats?.review_rate)}`" />
        <StatCard label="Flagged amount" :value="money(stats?.total_flagged_amount)" tone="default" :hint="`avg ${money(stats?.avg_flagged_amount)}`" />
      </div>

      <!-- Trend -->
      <SectionCard title="Decision trend" :subtitle="`Daily volume over the last ${days} days`">
        <div v-if="!series.length" class="py-10 text-center text-sm text-slate-400">No time-series data.</div>
        <div v-else class="flex items-end gap-1 h-44">
          <div v-for="d in series" :key="d.date" class="flex-1 flex flex-col items-center justify-end group relative">
            <div class="w-full flex flex-col justify-end rounded-t overflow-hidden" :style="{ height: `${(d.total / maxTotal) * 100}%` }">
              <div class="bg-rose-500" :style="{ height: `${(d.blocked / Math.max(1, d.total)) * 100}%` }" />
              <div class="bg-amber-400" :style="{ height: `${(d.reviewed / Math.max(1, d.total)) * 100}%` }" />
              <div class="bg-emerald-400" :style="{ height: `${(d.allowed / Math.max(1, d.total)) * 100}%` }" />
            </div>
            <div class="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-900 text-white text-[10px] px-2 py-1 z-10">
              {{ shortDate(d.date) }} · {{ d.total }} txns<br>{{ d.blocked }} blocked · {{ d.reviewed }} review
            </div>
          </div>
        </div>
        <div class="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Allowed</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Review</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Blocked</span>
        </div>
      </SectionCard>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Top users -->
        <SectionCard title="Highest-risk users">
          <div v-if="!users.length" class="py-8 text-center text-sm text-slate-400">No user risk data.</div>
          <ul v-else class="space-y-2.5">
            <li v-for="u in users" :key="u.user_id" class="flex items-center gap-3">
              <span class="font-mono text-xs text-slate-600 w-24 shrink-0 truncate">{{ u.user_id }}</span>
              <div class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full" :class="toneBg[riskTone(u.risk_score)]" :style="{ width: `${Math.round(u.risk_score * 100)}%` }" />
              </div>
              <span class="text-xs font-semibold w-10 text-right tabular-nums" :class="toneText[riskTone(u.risk_score)]">{{ Math.round(u.risk_score * 100) }}</span>
              <span class="text-[11px] text-slate-400 w-16 text-right">{{ u.blocked_count }}/{{ u.transaction_count }}</span>
            </li>
          </ul>
        </SectionCard>

        <!-- Signals -->
        <SectionCard title="Top signals">
          <div v-if="!signals.length" class="py-8 text-center text-sm text-slate-400">No signal data.</div>
          <ul v-else class="space-y-2.5">
            <li v-for="s in signals" :key="s.signal" class="flex items-center gap-3">
              <span class="text-xs text-slate-600 flex-1 truncate">{{ s.signal }}</span>
              <div class="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${Math.round(s.pct * 100)}%` }" />
              </div>
              <span class="text-xs font-semibold text-slate-700 w-8 text-right tabular-nums">{{ s.count }}</span>
            </li>
          </ul>
        </SectionCard>
      </div>

      <!-- Locations -->
      <SectionCard title="Risk by location">
        <div v-if="!locations.length" class="py-8 text-center text-sm text-slate-400">No location data.</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th class="text-left py-2 font-semibold">Location</th>
              <th class="text-right py-2 font-semibold">Txns</th>
              <th class="text-right py-2 font-semibold">Blocked</th>
              <th class="text-right py-2 font-semibold">Amount</th>
              <th class="text-right py-2 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="l in locations" :key="l.location">
              <td class="py-2 text-slate-700">{{ l.location || '—' }}</td>
              <td class="py-2 text-right text-slate-500 tabular-nums">{{ l.transaction_count }}</td>
              <td class="py-2 text-right text-slate-500 tabular-nums">{{ l.blocked_count }}</td>
              <td class="py-2 text-right text-slate-500 tabular-nums">{{ money(l.total_amount) }}</td>
              <td class="py-2 text-right">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset"
                  :class="riskTone(l.risk_score) === 'rose' ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                    : riskTone(l.risk_score) === 'amber' ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'">
                  {{ Math.round(l.risk_score * 100) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </template>
  </div>
</template>
