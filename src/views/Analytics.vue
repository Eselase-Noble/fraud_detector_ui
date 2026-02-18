<!-- Analytics.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getDashboard } from '@/api/analytics'
import type { DashboardSummary } from '@/types/fraud'

// Multi-word component name to satisfy ESLint
defineOptions({
  name: 'Analytics',
})

const summary = ref<DashboardSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const days = ref<number>(7)

// Load dashboard data
const load = async () => {
  loading.value = true
  error.value = null
  try {
    // Ensure days.value is always a number
    summary.value = await getDashboard(days.value ?? 7)
  } catch {
    error.value = 'Failed to load dashboard data. Make sure the API is running.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Formatting helpers
const fmt = (n: number | undefined) => n != null ? n.toLocaleString() : '—'

const pct = (n: number | undefined) =>
  n != null ? `${(n * 100).toFixed(1)}%` : '—'

const money = (n: number | undefined) =>
  n != null
    ? `$${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
    : '—'

// Score helpers
const scoreColor = (score: number) => {
  if (score > 0.6) return 'text-red-400'
  if (score > 0.35) return 'text-yellow-400'
  return 'text-green-400'
}

const scoreBarBg = (score: number) => {
  if (score > 0.6) return 'bg-red-400'
  if (score > 0.35) return 'bg-yellow-400'
  return 'bg-green-400'
}

// Sparkline helper: turn timeseries counts into an SVG polyline
const sparklinePath = (
  series: { blocked: number; reviewed?: number; allowed?: number }[],
  key: 'blocked' | 'reviewed' | 'allowed'
) => {
  if (!series.length) return ''
  const vals: number[] = series.map(d => d[key] ?? 0)
  const max = Math.max(...vals, 1)
  const w = 120
  const h = 32
  return vals
    .map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * h}`)
    .join(' ')
}
</script>

<template>
  <section class="min-h-screen bg-neutral-950 text-white px-6 py-24">
    <div class="max-w-7xl mx-auto">

      <!-- HEADER -->
      <header class="text-center mb-16">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-white/10
                 bg-white/5 px-4 py-1.5 text-xs text-gray-300 backdrop-blur"
        >
          Analytics · Risk Intelligence · Decision Support
        </span>
        <h1
          class="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight
                 bg-gradient-to-br from-white via-gray-200 to-gray-400
                 bg-clip-text text-transparent"
        >
          Fraud Analytics Dashboard
        </h1>
        <p class="mt-5 max-w-2xl mx-auto text-lg text-gray-400">
          Monitor fraud activity, model behavior, and systemic risk signals
          across transactions, users, geographies, and merchants.
        </p>

        <!-- Period selector -->
        <div class="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            v-for="d in [7, 14, 30, 90]"
            :key="d"
            @click="days = d; load()"
            class="rounded-lg px-4 py-1.5 text-sm transition"
            :class="days === d
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-gray-400 hover:text-white'"
          >
            {{ d }}d
          </button>
        </div>
      </header>

      <!-- LOADING -->
      <div v-if="loading" class="flex items-center justify-center py-32">
        <div class="flex flex-col items-center gap-4 text-gray-400">
          <svg class="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <span class="text-sm">Loading analytics data…</span>
        </div>
      </div>

      <!-- ERROR -->
      <div
        v-else-if="error"
        class="mx-auto max-w-lg rounded-2xl border border-red-400/30 bg-red-400/10
               px-8 py-10 text-center"
      >
        <p class="text-red-300 font-semibold mb-2">⚠ Failed to load data</p>
        <p class="text-sm text-gray-400">{{ error }}</p>
        <button
          @click="load"
          class="mt-6 rounded-xl bg-white/10 px-6 py-2 text-sm hover:bg-white/20 transition"
        >Retry</button>
      </div>

      <template v-else-if="summary">

        <!-- KPI STRIP -->
        <section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-16">

          <div class="kpi-card">
            <span class="kpi-label">Total Transactions</span>
            <span class="kpi-value">{{ fmt(summary.stats.total_transactions) }}</span>
            <div class="mt-3 flex items-end gap-3">
              <svg width="120" height="32" class="opacity-50">
                <polyline
                  :points="sparklinePath(summary.recent_timeseries, 'allowed')"
                  fill="none" stroke="#818cf8" stroke-width="1.5"
                />
              </svg>
              <span class="text-xs text-gray-500 mb-1">30d trend</span>
            </div>
          </div>

          <div class="kpi-card border-red-400/20">
            <span class="kpi-label">Blocked</span>
            <span class="kpi-value text-red-400">{{ fmt(summary.stats.blocked) }}</span>
            <span class="mt-1 text-xs text-gray-500">
              Fraud rate: <span class="text-red-300 font-medium">{{ pct(summary.stats.fraud_rate) }}</span>
            </span>
          </div>

          <div class="kpi-card border-yellow-400/20">
            <span class="kpi-label">Under Review</span>
            <span class="kpi-value text-yellow-400">{{ fmt(summary.stats.reviewed) }}</span>
            <span class="mt-1 text-xs text-gray-500">
              Review rate: <span class="text-yellow-300 font-medium">{{ pct(summary.stats.review_rate) }}</span>
            </span>
          </div>

          <div class="kpi-card border-indigo-400/20">
            <span class="kpi-label">Flagged Amount</span>
            <span class="kpi-value text-indigo-400 text-xl">{{ money(summary.stats.total_flagged_amount) }}</span>
            <span class="mt-1 text-xs text-gray-500">
              Avg: <span class="text-indigo-300 font-medium">{{ money(summary.stats.avg_flagged_amount) }}</span>
            </span>
          </div>
        </section>

        <!-- TIME SERIES -->
        <section class="mb-16">
          <h2 class="section-title">Transaction Volume · Last {{ days }} Days</h2>
          <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
              <tr class="border-b border-white/10">
                <th class="th">Date</th>
                <th class="th">Total</th>
                <th class="th text-green-400">Allowed</th>
                <th class="th text-yellow-400">Reviewed</th>
                <th class="th text-red-400">Blocked</th>
                <th class="th">Block Rate</th>
                <th class="th">Volume ($)</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="row in summary.recent_timeseries"
                :key="row.date"
                class="border-b border-white/5 transition hover:bg-white/5"
              >
                <td class="td font-mono text-gray-300">{{ row.date }}</td>
                <td class="td">{{ fmt(row.total) }}</td>
                <td class="td text-green-400">{{ fmt(row.allowed) }}</td>
                <td class="td text-yellow-400">{{ fmt(row.reviewed) }}</td>
                <td class="td text-red-400">{{ fmt(row.blocked) }}</td>
                <td class="td">
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-16 rounded-full bg-black/40 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-red-400"
                        :style="{ width: `${row.total ? (row.blocked / row.total) * 100 : 0}%` }"
                      />
                    </div>
                    <span class="text-xs text-gray-400">
                        {{ row.total ? ((row.blocked / row.total) * 100).toFixed(1) : 0 }}%
                      </span>
                  </div>
                </td>
                <td class="td text-gray-400">${{ (row.total_amount / 1000).toFixed(1) }}K</td>
              </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- BOTTOM GRID: Users + Locations + Signals -->
        <div class="grid gap-8 lg:grid-cols-3">

          <!-- TOP RISK USERS -->
          <div class="panel">
            <h2 class="section-title">Highest Risk Users</h2>
            <ul class="space-y-5">
              <li v-for="(user, i) in summary.top_risky_users" :key="user.user_id">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-2">
                    <span class="rank">{{ i + 1 }}</span>
                    <span class="font-mono text-sm text-gray-200">{{ user.user_id }}</span>
                  </div>
                  <span class="text-xs text-gray-500">
                    {{ user.blocked_count }}/{{ user.transaction_count }} blocked
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="scoreBarBg(user.risk_score)"
                      :style="{ width: `${user.risk_score * 100}%` }"
                    />
                  </div>
                  <span class="text-xs font-semibold tabular-nums" :class="scoreColor(user.risk_score)">
                    {{ pct(user.risk_score) }}
                  </span>
                </div>
              </li>
              <li v-if="!summary.top_risky_users.length" class="text-sm text-gray-500">
                No data yet.
              </li>
            </ul>
          </div>

          <!-- LOCATION RISK -->
          <div class="panel">
            <h2 class="section-title">Geographic Risk</h2>
            <ul class="space-y-4">
              <li v-for="loc in summary.location_breakdown" :key="loc.location">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm font-medium flex items-center gap-1.5">
                    🌍 {{ loc.location }}
                  </span>
                  <span class="text-xs text-gray-500">{{ fmt(loc.transaction_count) }} txns</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="scoreBarBg(loc.risk_score)"
                      :style="{ width: `${loc.risk_score * 100}%` }"
                    />
                  </div>
                  <span class="text-xs font-semibold tabular-nums" :class="scoreColor(loc.risk_score)">
                    {{ pct(loc.risk_score) }}
                  </span>
                </div>
              </li>
              <li v-if="!summary.location_breakdown.length" class="text-sm text-gray-500">
                No data yet.
              </li>
            </ul>
          </div>

          <!-- SIGNAL FREQUENCY -->
          <div class="panel">
            <h2 class="section-title">Top Fraud Signals</h2>
            <ul class="space-y-3">
              <li
                v-for="(sig, i) in summary.signal_frequency"
                :key="sig.signal"
                class="flex items-start gap-3"
              >
                <span class="rank mt-0.5 shrink-0">{{ i + 1 }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-gray-300 truncate pr-2">{{ sig.signal }}</span>
                    <span class="text-xs text-gray-500 shrink-0">{{ sig.pct }}%</span>
                  </div>
                  <div class="h-1 rounded-full bg-black/40 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-indigo-400 transition-all duration-500"
                      :style="{ width: `${sig.pct}%` }"
                    />
                  </div>
                </div>
              </li>
              <li v-if="!summary.signal_frequency.length" class="text-sm text-gray-500">
                No signals recorded yet.
              </li>
            </ul>
          </div>
        </div>

      </template>

    </div>
  </section>
</template>

<style scoped>
.kpi-card {
  @apply rounded-2xl border border-white/10 bg-black/40 backdrop-blur
  px-6 py-5 flex flex-col;
}
.kpi-label { @apply text-xs uppercase tracking-widest text-gray-500 font-semibold; }
.kpi-value { @apply mt-2 text-3xl font-extrabold tabular-nums; }

.section-title {
  @apply text-xs uppercase tracking-widest text-gray-500 font-semibold mb-5;
}
.panel {
  @apply rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6;
}

.rank {
  @apply flex h-5 w-5 items-center justify-center rounded
  bg-white/10 text-xs font-bold text-gray-400;
}

.th {
  @apply px-4 py-3 text-left text-xs uppercase tracking-wide
  text-gray-500 font-semibold whitespace-nowrap;
}
.td {
  @apply px-4 py-3 text-sm whitespace-nowrap;
}
</style>
