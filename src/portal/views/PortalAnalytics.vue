<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAnalytics } from '@/portal/api'
import type { DashboardSummary } from '@/portal/types'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatCard from '@/components/ui/StatCard.vue'

const RANGES = [7, 30, 90] as const
const days = ref<number>(30)
const data = ref<DashboardSummary | null>(null)
const loading = ref(true)

const load = async () => {
  loading.value = true
  try { data.value = await getAnalytics(days.value) } catch { data.value = null } finally { loading.value = false }
}
onMounted(load)
const setRange = (d: number) => { days.value = d; load() }

const s = computed(() => data.value?.stats)
const series = computed(() => data.value?.recent_timeseries || [])
const maxTotal = computed(() => Math.max(1, ...series.value.map(d => d.total)))
const pct = (n = 0) => `${(n * 100).toFixed(1)}%`
const money = (n = 0) => `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const shortDate = (x: string) => { try { return new Date(x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return x } }
const riskTone = (v = 0) => (v >= 0.66 ? 'rose' : v >= 0.33 ? 'amber' : 'emerald')
const toneBg: Record<string, string> = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Analytics</h2>
        <p class="text-sm text-slate-500">Real-time fraud trends for your institution.</p>
      </div>
      <div class="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        <button v-for="d in RANGES" :key="d" @click="setRange(d)"
          class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
          :class="days === d ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'">{{ d }}d</button>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">
      <div class="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /><div class="mt-3">Loading analytics…</div>
    </div>

    <template v-else-if="s">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Transactions" :value="s.total_transactions.toLocaleString()" tone="indigo" :hint="`last ${days} days`" />
        <StatCard label="Blocked" :value="s.blocked" tone="rose" :hint="`fraud rate ${pct(s.fraud_rate)}`" />
        <StatCard label="Under review" :value="s.reviewed" tone="amber" :hint="`review rate ${pct(s.review_rate)}`" />
        <StatCard label="Flagged amount" :value="money(s.total_flagged_amount)" tone="default" :hint="`avg ${money(s.avg_flagged_amount)}`" />
      </div>

      <SectionCard title="Decision trend" :subtitle="`Daily volume over the last ${days} days`">
        <div v-if="!series.length" class="py-10 text-center text-sm text-slate-400">No data in this window.</div>
        <div v-else class="flex items-end gap-1 h-44">
          <div v-for="d in series" :key="d.date" class="flex-1 flex flex-col items-center justify-end group relative">
            <div class="w-full flex flex-col justify-end rounded-t overflow-hidden" :style="{ height: `${(d.total / maxTotal) * 100}%` }">
              <div class="bg-rose-500" :style="{ height: `${(d.blocked / Math.max(1, d.total)) * 100}%` }" />
              <div class="bg-amber-400" :style="{ height: `${(d.reviewed / Math.max(1, d.total)) * 100}%` }" />
              <div class="bg-emerald-400" :style="{ height: `${(d.allowed / Math.max(1, d.total)) * 100}%` }" />
            </div>
            <div class="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-900 text-white text-[10px] px-2 py-1 z-10">
              {{ shortDate(d.date) }} · {{ d.total }} txns
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
        <SectionCard title="Highest-risk users">
          <div v-if="!data?.top_risky_users.length" class="py-8 text-center text-sm text-slate-400">No user data.</div>
          <ul v-else class="space-y-2.5">
            <li v-for="u in data.top_risky_users" :key="u.user_id" class="flex items-center gap-3">
              <span class="font-mono text-xs text-slate-600 w-24 shrink-0 truncate">{{ u.user_id }}</span>
              <div class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full" :class="toneBg[riskTone(u.risk_score)]" :style="{ width: `${Math.round(u.risk_score * 100)}%` }" />
              </div>
              <span class="text-[11px] text-slate-400 w-16 text-right">{{ u.blocked_count }}/{{ u.transaction_count }}</span>
            </li>
          </ul>
        </SectionCard>
        <SectionCard title="Top signals">
          <div v-if="!data?.signal_frequency.length" class="py-8 text-center text-sm text-slate-400">No signals recorded.</div>
          <ul v-else class="space-y-2.5">
            <li v-for="sig in data.signal_frequency" :key="sig.signal" class="flex items-center gap-3">
              <span class="text-xs text-slate-600 flex-1 truncate">{{ sig.signal }}</span>
              <div class="w-32 h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full bg-indigo-500" :style="{ width: `${Math.round(sig.pct)}%` }" /></div>
              <span class="text-xs font-semibold text-slate-700 w-8 text-right tabular-nums">{{ sig.count }}</span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </template>

    <div v-else class="py-16 text-center text-sm text-slate-500">No analytics available yet.</div>
  </div>
</template>
