<!-- Analytics.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { getDashboard, getTimeSeries, getTopUsers, getLocationRisk } from '@/api/analytics'
import type { DashboardSummary, TimeSeries, TopUser, LocationRisk } from '@/types/fraud'

defineOptions({ name: 'AnalyticsDashboard' })

// ─── State ────────────────────────────────────────────────────────────────────
const summary    = ref<DashboardSummary | null>(null)
const timeseries = ref<TimeSeries[]>([])
const topUsers   = ref<TopUser[]>([])
const locations  = ref<LocationRisk[]>([])

const loading = ref(true)
const error   = ref<string | null>(null)
const days    = ref<number>(7)

// Active section tab
type Tab = 'overview' | 'timeseries' | 'users' | 'locations'
const activeTab = ref<Tab>('overview')

// Users table sort
const userSort  = ref<'risk_score' | 'total_amount' | 'transaction_count'>('risk_score')
const userDir   = ref<'desc' | 'asc'>('desc')

// ─── Load ─────────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  error.value   = null
  try {
    const d = days.value ?? 30
    const [dash, ts, users, locs] = await Promise.all([
      getDashboard(d),
      getTimeSeries(d),
      getTopUsers(50, d),      // fetch top 50 for full users table
      getLocationRisk(d),
    ])
    summary.value    = dash
    timeseries.value = ts
    topUsers.value   = users
    locations.value  = locs
  } catch {
    error.value = 'Failed to load dashboard data. Make sure the API is running.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const setDays = (d: number) => { days.value = d; load() }

// ─── Computed ─────────────────────────────────────────────────────────────────

// Full timeseries sorted ascending (already from API, but ensure)
const sortedTimeseries = computed(() =>
  [...timeseries.value].sort((a, b) => a.date.localeCompare(b.date))
)

// Chart max for scaling bars
const tsMax = computed(() =>
  Math.max(...sortedTimeseries.value.map(r => r.total), 1)
)

// Sorted users table
const sortedUsers = computed(() => {
  const arr = [...topUsers.value]
  arr.sort((a, b) => {
    const va = a[userSort.value] as number
    const vb = b[userSort.value] as number
    return userDir.value === 'desc' ? vb - va : va - vb
  })
  return arr
})

const setUserSort = (col: typeof userSort.value) => {
  if (userSort.value === col) {
    userDir.value = userDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    userSort.value = col
    userDir.value  = 'desc'
  }
}

// Locations max for bar scaling
const locMax = computed(() =>
  Math.max(...locations.value.map(l => l.transaction_count), 1)
)

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt   = (n?: number)  => n != null ? n.toLocaleString() : '—'
const pct   = (n?: number)  => n != null ? `${(n * 100).toFixed(1)}%` : '—'
const money = (n?: number)  => n != null
  ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : '—'

const blockRate = (row: TimeSeries) =>
  row.total ? ((row.blocked / row.total) * 100).toFixed(1) : '0.0'

const riskClass = (score: number) =>
  score > 0.6 ? 'text-red-400' : score > 0.35 ? 'text-yellow-400' : 'text-green-400'

const riskBg = (score: number) =>
  score > 0.6 ? 'bg-red-400' : score > 0.35 ? 'bg-yellow-400' : 'bg-green-400'

// const decisionClass = (d: string) =>
//   d === 'BLOCK' ? 'text-red-400 bg-red-400/10 border-red-400/30'
//     : d === 'REVIEW' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
//       : 'text-green-400 bg-green-400/10 border-green-400/30'

// Sparkline SVG points
const sparkPoints = (key: 'blocked' | 'allowed') => {
  const series = sortedTimeseries.value.slice(-14)
  if (!series.length) return ''
  const vals = series.map(d => d[key])
  const max  = Math.max(...vals, 1)
  return vals.map((v, i) =>
    `${(i / Math.max(series.length - 1, 1)) * 120},${28 - (v / max) * 28}`
  ).join(' ')
}

const sortIcon = (col: string) => {
  if (userSort.value !== col) return '↕'
  return userDir.value === 'desc' ? '↓' : '↑'
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-white" style="font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace;">

    <!-- Google Font -->
    <component :is="'style'">
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
    </component>

    <div class="max-w-screen-xl mx-auto px-6 py-24">

      <!-- ── HEADER ─────────────────────────────────────────────────────────── -->
      <header class="mb-14">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-xs tracking-[0.25em] text-indigo-400 uppercase mb-3 font-medium">
              Sentinel · Fraud Intelligence Platform
            </p>
            <h1 class="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
              Analytics
            </h1>
            <p class="mt-3 text-sm text-gray-400 max-w-lg" style="font-family: 'IBM Plex Sans', sans-serif;">
              Real-time fraud monitoring across transactions, users, geographies, and risk signals.
            </p>
          </div>

          <!-- Period selector -->
          <div class="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1 self-start md:self-auto">
            <button
              v-for="d in [7, 14, 30, 90]" :key="d"
              @click="setDays(d)"
              class="rounded-lg px-4 py-2 text-xs font-semibold transition-all tracking-wider"
              :class="days === d ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'"
            >{{ d }}D</button>
          </div>
        </div>

        <!-- Tab nav -->
        <nav class="mt-10 flex gap-0 border-b border-white/10">
          <button
            v-for="tab in (['overview', 'timeseries', 'users', 'locations'] as Tab[])"
            :key="tab"
            @click="activeTab = tab"
            class="px-5 py-3 text-xs tracking-[0.15em] uppercase font-semibold transition-all border-b-2 -mb-px"
            :class="activeTab === tab
              ? 'border-indigo-400 text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'"
          >{{ tab }}</button>
        </nav>
      </header>

      <!-- ── LOADING ─────────────────────────────────────────────────────────── -->
      <div v-if="loading" class="flex items-center justify-center py-40">
        <div class="flex flex-col items-center gap-5">
          <div class="relative h-10 w-10">
            <div class="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
            <div class="absolute inset-1 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          </div>
          <p class="text-xs tracking-[0.2em] text-gray-500 uppercase">Loading intelligence data…</p>
        </div>
      </div>

      <!-- ── ERROR ───────────────────────────────────────────────────────────── -->
      <div v-else-if="error" class="mx-auto max-w-md mt-20 rounded-2xl border border-red-400/20 bg-red-400/5 p-10 text-center">
        <div class="text-3xl mb-4">⚠</div>
        <p class="text-red-300 font-semibold mb-2">Connection Failed</p>
        <p class="text-xs text-gray-500 mb-6" style="font-family:'IBM Plex Sans',sans-serif;">{{ error }}</p>
        <button @click="load" class="rounded-lg border border-white/10 bg-white/5 px-6 py-2 text-xs tracking-widest uppercase hover:bg-white/10 transition">
          Retry
        </button>
      </div>

      <template v-else-if="summary">

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- TAB: OVERVIEW                                                    -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'overview'">

          <!-- KPI row -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">

            <div class="kpi-card">
              <span class="kpi-label">Total Transactions</span>
              <span class="kpi-value">{{ fmt(summary.stats.total_transactions) }}</span>
              <svg width="120" height="32" class="mt-3 opacity-40">
                <polyline :points="sparkPoints('allowed')" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </div>

            <div class="kpi-card" style="border-color: rgba(248,113,113,0.2);">
              <span class="kpi-label">Blocked</span>
              <span class="kpi-value text-red-400">{{ fmt(summary.stats.blocked) }}</span>
              <div class="mt-3 flex items-center gap-2">
                <div class="h-1 flex-1 bg-black/40 rounded overflow-hidden">
                  <div class="h-full bg-red-400 rounded" :style="{ width: pct(summary.stats.fraud_rate) }" />
                </div>
                <span class="text-xs text-red-400/70">{{ pct(summary.stats.fraud_rate) }}</span>
              </div>
            </div>

            <div class="kpi-card" style="border-color: rgba(250,204,21,0.2);">
              <span class="kpi-label">Under Review</span>
              <span class="kpi-value text-yellow-400">{{ fmt(summary.stats.reviewed) }}</span>
              <div class="mt-3 flex items-center gap-2">
                <div class="h-1 flex-1 bg-black/40 rounded overflow-hidden">
                  <div class="h-full bg-yellow-400 rounded" :style="{ width: pct(summary.stats.review_rate) }" />
                </div>
                <span class="text-xs text-yellow-400/70">{{ pct(summary.stats.review_rate) }}</span>
              </div>
            </div>

            <div class="kpi-card" style="border-color: rgba(129,140,248,0.2);">
              <span class="kpi-label">Flagged Amount</span>
              <span class="kpi-value text-indigo-400 text-2xl">{{ money(summary.stats.total_flagged_amount) }}</span>
              <span class="mt-2 text-xs text-gray-600">avg {{ money(summary.stats.avg_flagged_amount) }}</span>
            </div>
          </div>

          <!-- Mini charts row -->
          <div class="grid lg:grid-cols-3 gap-6 mb-12">

            <!-- Recent trend mini -->
            <div class="panel col-span-1 lg:col-span-1">
              <p class="section-label mb-5">14-Day Blocked Trend</p>
              <div class="flex items-end gap-1 h-20">
                <div
                  v-for="row in sortedTimeseries.slice(-14)"
                  :key="row.date"
                  class="flex-1 flex flex-col justify-end gap-0.5"
                >
                  <div
                    class="w-full rounded-sm bg-red-400/70 transition-all duration-500"
                    :style="{ height: `${row.total ? (row.blocked / row.total) * 100 : 0}%`, minHeight: row.blocked ? '2px' : '0' }"
                    :title="`${row.date}: ${row.blocked} blocked`"
                  />
                </div>
              </div>
              <div class="flex justify-between mt-2 text-xs text-gray-600">
                <span>{{ sortedTimeseries.slice(-14)[0]?.date?.slice(5) ?? '' }}</span>
                <span>{{ sortedTimeseries.slice(-1)[0]?.date?.slice(5) ?? 'today' }}</span>
              </div>
            </div>

            <!-- Top signals mini -->
            <div class="panel col-span-1 lg:col-span-2">
              <p class="section-label mb-5">Top Risk Signals</p>
              <ul class="space-y-3">
                <li
                  v-for="sig in summary.signal_frequency.slice(0, 6)"
                  :key="sig.signal"
                  class="flex items-center gap-3"
                >
                  <span class="text-xs text-gray-500 w-4 text-right shrink-0">{{ sig.pct }}%</span>
                  <div class="flex-1 h-1.5 rounded bg-black/40 overflow-hidden">
                    <div
                      class="h-full rounded bg-indigo-400 transition-all duration-700"
                      :style="{ width: `${Math.min(sig.pct * 3, 100)}%` }"
                    />
                  </div>
                  <span class="text-xs text-gray-400 truncate w-48" style="font-family:'IBM Plex Sans',sans-serif;">
                    {{ sig.signal }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Top 5 locations preview -->
          <div class="panel">
            <p class="section-label mb-5">Geographic Risk Snapshot</p>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                v-for="loc in summary.location_breakdown.slice(0, 5)"
                :key="loc.location"
                class="rounded-xl border border-white/5 bg-black/30 p-4 text-center"
              >
                <p class="text-lg mb-1">🌍</p>
                <p class="text-xs font-semibold text-white truncate">{{ loc.location }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ fmt(loc.transaction_count) }} txns</p>
                <p class="mt-2 text-sm font-bold" :class="riskClass(loc.risk_score)">
                  {{ pct(loc.risk_score) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- TAB: TIMESERIES                                                  -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'timeseries'">

          <!-- Bar chart -->
          <div class="panel mb-8">
            <p class="section-label mb-6">Daily Transaction Volume · {{ days }}-Day Window</p>

            <!-- Legend -->
            <div class="flex items-center gap-6 mb-6 text-xs">
              <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-2 rounded-sm bg-indigo-400/60" /> Allowed</span>
              <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-2 rounded-sm bg-yellow-400" /> Reviewed</span>
              <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-2 rounded-sm bg-red-400" /> Blocked</span>
            </div>

            <!-- Stacked bar chart -->
            <div class="flex items-end gap-1 h-48 overflow-x-auto pb-6">
              <div
                v-for="row in sortedTimeseries"
                :key="row.date"
                class="flex-1 min-w-[10px] max-w-[32px] flex flex-col justify-end gap-px group cursor-pointer"
                :title="`${row.date}\nTotal: ${row.total}\nBlocked: ${row.blocked}\nReviewed: ${row.reviewed}\nAllowed: ${row.allowed}`"
              >
                <!-- Blocked -->
                <div
                  class="w-full rounded-t-sm bg-red-400 transition-all duration-300 group-hover:bg-red-300"
                  :style="{ height: `${(row.blocked / tsMax) * 180}px`, minHeight: row.blocked ? '1px' : '0' }"
                />
                <!-- Reviewed -->
                <div
                  class="w-full bg-yellow-400 transition-all duration-300 group-hover:bg-yellow-300"
                  :style="{ height: `${(row.reviewed / tsMax) * 180}px`, minHeight: row.reviewed ? '1px' : '0' }"
                />
                <!-- Allowed -->
                <div
                  class="w-full rounded-b-sm bg-indigo-400/50 transition-all duration-300 group-hover:bg-indigo-400/70"
                  :style="{ height: `${(row.allowed / tsMax) * 180}px`, minHeight: row.allowed ? '1px' : '0' }"
                />
              </div>
            </div>

            <!-- X axis labels (every 5th) -->
            <div class="flex items-start gap-1 overflow-x-auto">
              <div
                v-for="(row, i) in sortedTimeseries"
                :key="row.date"
                class="flex-1 min-w-[10px] max-w-[32px] text-center"
              >
                <span v-if="i % 5 === 0" class="text-xs text-gray-600 block">{{ row.date.slice(5) }}</span>
              </div>
            </div>
          </div>

          <!-- Data table -->
          <div class="panel overflow-x-auto">
            <p class="section-label mb-5">Daily Breakdown Table</p>
            <table class="w-full text-xs">
              <thead>
              <tr class="border-b border-white/10">
                <th class="th">Date</th>
                <th class="th text-right">Total</th>
                <th class="th text-right text-green-400">Allowed</th>
                <th class="th text-right text-yellow-400">Reviewed</th>
                <th class="th text-right text-red-400">Blocked</th>
                <th class="th">Block Rate</th>
                <th class="th text-right">Volume</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="row in [...sortedTimeseries].reverse()"
                :key="row.date"
                class="border-b border-white/5 hover:bg-white/5 transition"
              >
                <td class="td font-mono">{{ row.date }}</td>
                <td class="td text-right">{{ fmt(row.total) }}</td>
                <td class="td text-right text-green-400">{{ fmt(row.allowed) }}</td>
                <td class="td text-right text-yellow-400">{{ fmt(row.reviewed) }}</td>
                <td class="td text-right text-red-400">{{ fmt(row.blocked) }}</td>
                <td class="td">
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-1 bg-black/40 rounded overflow-hidden">
                      <div class="h-full bg-red-400 rounded" :style="{ width: `${row.total ? (row.blocked/row.total)*100 : 0}%` }" />
                    </div>
                    <span class="text-gray-500">{{ blockRate(row) }}%</span>
                  </div>
                </td>
                <td class="td text-right text-gray-400">${{ (row.total_amount / 1000).toFixed(1) }}K</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- TAB: USERS                                                       -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'users'">

          <!-- Summary strip -->
          <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="panel text-center">
              <p class="section-label mb-2">Total Users</p>
              <p class="text-3xl font-bold">{{ fmt(topUsers.length) }}</p>
            </div>
            <div class="panel text-center">
              <p class="section-label mb-2">High Risk Users</p>
              <p class="text-3xl font-bold text-red-400">
                {{ topUsers.filter(u => u.risk_score > 0.6).length }}
              </p>
            </div>
            <div class="panel text-center">
              <p class="section-label mb-2">Avg Risk Score</p>
              <p class="text-3xl font-bold text-yellow-400">
                {{ topUsers.length
                ? `${((topUsers.reduce((a, u) => a + u.risk_score, 0) / topUsers.length) * 100).toFixed(1)}%`
                : '—' }}
              </p>
            </div>
          </div>

          <div class="panel overflow-x-auto">
            <p class="section-label mb-5">User Risk Table · Top {{ topUsers.length }}</p>

            <table class="w-full text-xs">
              <thead>
              <tr class="border-b border-white/10">
                <th class="th">#</th>
                <th class="th">User ID</th>
                <th class="th cursor-pointer hover:text-white transition" @click="setUserSort('transaction_count')">
                  Transactions {{ sortIcon('transaction_count') }}
                </th>
                <th class="th">Blocked</th>
                <th class="th cursor-pointer hover:text-white transition" @click="setUserSort('total_amount')">
                  Volume {{ sortIcon('total_amount') }}
                </th>
                <th class="th cursor-pointer hover:text-white transition" @click="setUserSort('risk_score')">
                  Risk Score {{ sortIcon('risk_score') }}
                </th>
                <th class="th">Decision Dist.</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="(user, i) in sortedUsers"
                :key="user.user_id"
                class="border-b border-white/5 hover:bg-white/5 transition group"
              >
                <td class="td text-gray-600">{{ i + 1 }}</td>
                <td class="td font-mono text-indigo-300">{{ user.user_id }}</td>
                <td class="td text-right">{{ fmt(user.transaction_count) }}</td>
                <td class="td text-right text-red-400">{{ fmt(user.blocked_count) }}</td>
                <td class="td text-right text-gray-300">{{ money(user.total_amount) }}</td>
                <td class="td">
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-1.5 bg-black/40 rounded overflow-hidden">
                      <div
                        class="h-full rounded transition-all duration-500"
                        :class="riskBg(user.risk_score)"
                        :style="{ width: `${user.risk_score * 100}%` }"
                      />
                    </div>
                    <span class="font-semibold tabular-nums" :class="riskClass(user.risk_score)">
                        {{ pct(user.risk_score) }}
                      </span>
                  </div>
                </td>
                <td class="td">
                  <div class="flex gap-1">
                    <!-- BLOCK bar -->
                    <div
                      class="h-4 rounded-sm bg-red-400/70"
                      :style="{ width: `${user.transaction_count ? (user.blocked_count / user.transaction_count) * 64 : 0}px` }"
                      :title="`${user.blocked_count} blocked`"
                    />
                    <!-- ALLOW bar -->
                    <div
                      class="h-4 rounded-sm bg-green-400/40"
                      :style="{ width: `${user.transaction_count ? ((user.transaction_count - user.blocked_count) / user.transaction_count) * 64 : 0}px` }"
                      :title="`${user.transaction_count - user.blocked_count} allowed/reviewed`"
                    />
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- TAB: LOCATIONS                                                   -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'locations'">

          <!-- Top stat cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              v-for="loc in locations.slice(0, 4)"
              :key="loc.location"
              class="panel border"
              :class="loc.risk_score > 0.6 ? 'border-red-400/20' : loc.risk_score > 0.35 ? 'border-yellow-400/20' : 'border-white/10'"
            >
              <p class="section-label mb-2">{{ loc.location }}</p>
              <p class="text-2xl font-bold" :class="riskClass(loc.risk_score)">{{ pct(loc.risk_score) }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ fmt(loc.transaction_count) }} transactions</p>
              <p class="text-xs text-red-400/70 mt-0.5">{{ fmt(loc.blocked_count) }} blocked</p>
            </div>
          </div>

          <!-- Horizontal bar chart -->
          <div class="panel mb-8">
            <p class="section-label mb-6">Transaction Volume by Location</p>
            <div class="space-y-4">
              <div
                v-for="loc in locations"
                :key="loc.location"
                class="flex items-center gap-4"
              >
                <div class="w-36 text-xs text-gray-300 truncate text-right shrink-0" style="font-family:'IBM Plex Sans',sans-serif;">
                  {{ loc.location }}
                </div>
                <div class="flex-1 flex gap-1 items-center h-6">
                  <!-- Allowed segment -->
                  <div
                    class="h-full rounded-sm bg-indigo-400/40 transition-all duration-700"
                    :style="{ width: `${((loc.transaction_count - loc.blocked_count) / locMax) * 100}%` }"
                    :title="`${loc.transaction_count - loc.blocked_count} allowed/reviewed`"
                  />
                  <!-- Blocked segment -->
                  <div
                    class="h-full rounded-sm bg-red-400 transition-all duration-700"
                    :style="{ width: `${(loc.blocked_count / locMax) * 100}%` }"
                    :title="`${loc.blocked_count} blocked`"
                  />
                </div>
                <span class="text-xs font-semibold w-12 text-right tabular-nums" :class="riskClass(loc.risk_score)">
                  {{ pct(loc.risk_score) }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-6 mt-6 text-xs text-gray-500">
              <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-2 rounded-sm bg-indigo-400/40"/>Allowed / Reviewed</span>
              <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-2 rounded-sm bg-red-400"/>Blocked</span>
            </div>
          </div>

          <!-- Full table -->
          <div class="panel overflow-x-auto">
            <p class="section-label mb-5">Full Location Risk Table</p>
            <table class="w-full text-xs">
              <thead>
              <tr class="border-b border-white/10">
                <th class="th">#</th>
                <th class="th">Location</th>
                <th class="th text-right">Transactions</th>
                <th class="th text-right text-red-400">Blocked</th>
                <th class="th text-right">Volume</th>
                <th class="th">Risk Score</th>
                <th class="th">Risk Level</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="(loc, i) in locations"
                :key="loc.location"
                class="border-b border-white/5 hover:bg-white/5 transition"
              >
                <td class="td text-gray-600">{{ i + 1 }}</td>
                <td class="td font-medium">{{ loc.location }}</td>
                <td class="td text-right">{{ fmt(loc.transaction_count) }}</td>
                <td class="td text-right text-red-400">{{ fmt(loc.blocked_count) }}</td>
                <td class="td text-right text-gray-400">${{ (loc.total_amount / 1000).toFixed(1) }}K</td>
                <td class="td">
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-1.5 bg-black/40 rounded overflow-hidden">
                      <div
                        class="h-full rounded"
                        :class="riskBg(loc.risk_score)"
                        :style="{ width: `${loc.risk_score * 100}%` }"
                      />
                    </div>
                    <span class="tabular-nums font-semibold" :class="riskClass(loc.risk_score)">
                        {{ pct(loc.risk_score) }}
                      </span>
                  </div>
                </td>
                <td class="td">
                    <span
                      class="rounded-full border px-2 py-0.5 text-xs font-semibold"
                      :class="loc.risk_score > 0.6
                        ? 'border-red-400/30 text-red-400 bg-red-400/10'
                        : loc.risk_score > 0.35
                          ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10'
                          : 'border-green-400/30 text-green-400 bg-green-400/10'"
                    >
                      {{ loc.risk_score > 0.6 ? 'HIGH' : loc.risk_score > 0.35 ? 'MEDIUM' : 'LOW' }}
                    </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </div>

    <!-- FOOTER -->
    <footer class="py-12 text-center border-t border-white/5 mt-16">
      <p class="text-xs tracking-widest text-gray-600 uppercase">
        © 2026
        <a href="https://nobleson.info" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-white transition mx-1">Noble Eselase Vulley</a>
        ·
        <a href="https://africodelab.net" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-white transition mx-1">AfricodeLab</a>
      </p>
      <p class="text-xs text-gray-700 mt-2">FastAPI · PostgreSQL · LangChain · FAISS · Tavily · Vue 3 · TypeScript</p>
    </footer>
  </div>
</template>

<style scoped>
.kpi-card {
  @apply rounded-2xl border border-white/10 bg-black/50 backdrop-blur px-5 py-5 flex flex-col;
}
.kpi-label { @apply text-xs tracking-[0.15em] uppercase text-gray-500 font-semibold; }
.kpi-value { @apply mt-2 text-3xl font-bold tabular-nums; }

.section-label { @apply text-xs tracking-[0.2em] uppercase text-gray-500 font-semibold; }

.panel {
  @apply rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6;
}

.rank {
  @apply flex h-5 w-5 items-center justify-center rounded
  bg-white/10 text-xs font-bold text-gray-400;
}

.th {
  @apply px-4 py-3 text-left tracking-[0.12em] uppercase
  text-gray-600 font-semibold whitespace-nowrap;
}
.td { @apply px-4 py-3 whitespace-nowrap; }
</style>
