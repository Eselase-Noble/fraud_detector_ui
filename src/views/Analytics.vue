<!-- Analytics.vue — Sentinel Intelligence Platform -->
<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted } from 'vue'
import { getDashboard, getTimeSeries, getTopUsers, getLocationRisk } from '@/api/analytics'
import type { DashboardSummary, TimeSeries, TopUser, LocationRisk } from '@/types/fraud'

defineOptions({ name: 'AnalyticsDashboard' })

// ─── State ───────────────────────────────────────────────────────────────────
const summary    = ref<DashboardSummary | null>(null)
const timeseries = ref<TimeSeries[]>([])
const topUsers   = ref<TopUser[]>([])
const locations  = ref<LocationRisk[]>([])
const loading    = ref(true)
const error      = ref<string | null>(null)
const days       = ref<number>(7)
const clock      = ref('')
const animIn     = ref(false)

type Tab = 'overview' | 'timeseries' | 'users' | 'locations'
const activeTab = ref<Tab>('overview')

const userSort = ref<'risk_score' | 'total_amount' | 'transaction_count'>('risk_score')
const userDir  = ref<'desc' | 'asc'>('desc')

// Tooltip
const tooltip = ref<{ visible: boolean; x: number; y: number; content: string }>({
  visible: false, x: 0, y: 0, content: ''
})

// ─── Clock ───────────────────────────────────────────────────────────────────
let clockTimer: ReturnType<typeof setInterval>
const updateClock = () => {
  clock.value = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })
}

// ─── Load ────────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  animIn.value  = false
  error.value   = null
  try {
    const d = days.value ?? 30
    const [dash, ts, users, locs] = await Promise.all([
      getDashboard(d), getTimeSeries(d), getTopUsers(50, d), getLocationRisk(d),
    ])
    summary.value    = dash
    timeseries.value = ts
    topUsers.value   = users
    locations.value  = locs
    setTimeout(() => { animIn.value = true }, 60)
  } catch {
    error.value = 'API unreachable — verify the server is running and CORS origins are configured.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  load()
})
onUnmounted(() => clearInterval(clockTimer))

const setDays = (d: number) => { days.value = d; load() }

// ─── Computed ────────────────────────────────────────────────────────────────
const sortedTS  = computed(() => [...timeseries.value].sort((a, b) => a.date.localeCompare(b.date)))
const tsMax     = computed(() => Math.max(...sortedTS.value.map(r => r.total), 1))
const locMax    = computed(() => Math.max(...locations.value.map(l => l.transaction_count), 1))

const sortedUsers = computed(() => {
  return [...topUsers.value].sort((a, b) => {
    const va = a[userSort.value] as number, vb = b[userSort.value] as number
    return userDir.value === 'desc' ? vb - va : va - vb
  })
})
const setUserSort = (col: typeof userSort.value) => {
  userSort.value === col ? (userDir.value = userDir.value === 'desc' ? 'asc' : 'desc')
    : (userSort.value = col, userDir.value = 'desc')
}

const criticalUsers  = computed(() => topUsers.value.filter(u => u.risk_score > 0.6).length)
const elevatedUsers  = computed(() => topUsers.value.filter(u => u.risk_score > 0.35 && u.risk_score <= 0.6).length)
const normalUsers    = computed(() => topUsers.value.filter(u => u.risk_score <= 0.35).length)
const avgRisk        = computed(() => topUsers.value.length
  ? topUsers.value.reduce((a, u) => a + u.risk_score, 0) / topUsers.value.length : 0)

const blockTrend = computed(() => {
  const first7  = sortedTS.value.slice(-14, -7).reduce((a, r) => a + r.blocked, 0)
  const second7 = sortedTS.value.slice(-7).reduce((a, r) => a + r.blocked, 0)
  if (!first7) return 0
  return ((second7 - first7) / first7) * 100
})

const totalVolume = computed(() =>
  sortedTS.value.reduce((a, r) => a + r.total_amount, 0))
const avgDailyBlock = computed(() =>
  sortedTS.value.length ? Math.round(sortedTS.value.reduce((a, r) => a + r.blocked, 0) / sortedTS.value.length) : 0)
const peakDay = computed(() =>
  sortedTS.value.reduce((a, r) => r.total > a.total ? r : a, sortedTS.value[0] ?? { total: 0, date: '—' }))
const overallBlockRate = computed(() => {
  const t = sortedTS.value.reduce((a, r) => a + r.total, 0)
  const b = sortedTS.value.reduce((a, r) => a + r.blocked, 0)
  return t ? (b / t) * 100 : 0
})

// Sparkline — area path for SVG
const sparkPath = (key: 'blocked' | 'allowed', W = 140, H = 36) => {
  const series = sortedTS.value.slice(-14)
  if (series.length < 2) return ''
  const vals  = series.map(d => d[key])
  const max   = Math.max(...vals, 1)
  const pts   = vals.map((v, i) => `${(i / (series.length - 1)) * W},${H - (v / max) * (H - 4)}`)
  return `M ${pts.join(' L ')}`
}
const sparkArea = (key: 'blocked' | 'allowed', W = 140, H = 36) => {
  const path = sparkPath(key, W, H)
  if (!path) return ''
  return `${path} L ${W},${H} L 0,${H} Z`
}

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt    = (n?: number) => n != null ? n.toLocaleString() : '—'
const pct    = (n?: number) => n != null ? `${(n * 100).toFixed(1)}%` : '—'
const rawPct = (n?: number) => n != null ? (n * 100).toFixed(1) : '0'
const money  = (n?: number) => n != null
  ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const shortMoney = (n?: number) => {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
const blockRatePct = (row: TimeSeries) =>
  row.total ? ((row.blocked / row.total) * 100).toFixed(1) : '0.0'

const riskHex   = (s: number) => s > 0.6 ? '#ff4444' : s > 0.35 ? '#f59e0b' : '#10b981'
const riskLabel = (s: number) => s > 0.6 ? 'CRITICAL' : s > 0.35 ? 'ELEVATED' : 'NORMAL'
const sortIcon  = (col: string) =>
  userSort.value !== col ? '⇅' : userDir.value === 'desc' ? '▼' : '▲'

const countryFlag = (loc: string) => {
  const map: Record<string, string> = {
    US:'🇺🇸', GB:'🇬🇧', NG:'🇳🇬', RU:'🇷🇺', CN:'🇨🇳', BR:'🇧🇷',
    IN:'🇮🇳', GH:'🇬🇭', DE:'🇩🇪', FR:'🇫🇷', CA:'🇨🇦', AU:'🇦🇺',
    JP:'🇯🇵', SG:'🇸🇬', MX:'🇲🇽', ID:'🇮🇩', RO:'🇷🇴', KE:'🇰🇪'
  }
  for (const [code, flag] of Object.entries(map)) {
    if (loc.includes(code)) return flag
  }
  return '🌍'
}

const showTip = (e: MouseEvent, content: string) => {
  tooltip.value = { visible: true, x: e.clientX + 12, y: e.clientY - 8, content }
}
const hideTip = () => { tooltip.value.visible = false }
</script>

<template>
  <div class="shell">
    <!-- Noise grain overlay -->
    <div class="grain" aria-hidden="true"/>
    <!-- Scanlines -->
    <div class="scanlines" aria-hidden="true"/>
    <!-- Ambient glow -->
    <div class="glow-orb glow-1" aria-hidden="true"/>
    <div class="glow-orb glow-2" aria-hidden="true"/>
    <div class="glow-orb glow-3" aria-hidden="true"/>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- SYSTEM TOPBAR                                                       -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="logo-mark">S</div>
        <div class="topbar-brand">
          <span class="brand-name">SENTINEL</span>
          <span class="brand-sub">Financial Intelligence Platform</span>
        </div>
      </div>
      <div class="topbar-center">
        <span class="sys-tag">SYS:LIVE</span>
        <span class="sys-tag threat" v-if="summary && summary.stats.fraud_rate > 0.1">
          ⚠ HIGH FRAUD RATE DETECTED
        </span>
        <span class="sys-tag safe" v-else-if="summary">✓ THREAT LEVEL NOMINAL</span>
      </div>
      <div class="topbar-right">
        <span class="clock-display">{{ clock }}</span>
        <span class="utc-tag">UTC</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- MAIN CONTENT                                                        -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <div class="main-wrap">

      <!-- Page header -->
      <header class="page-header" :class="{ 'anim-in': animIn }">
        <div class="page-header-left">
          <div class="page-eyebrow">
            <span class="pulse-ring"><span class="pulse-dot"/></span>
            LIVE INTELLIGENCE FEED
            <span class="divider-char">//</span>
            <span class="period-tag">{{ days }}-DAY WINDOW</span>
          </div>
          <h1 class="page-title">Fraud Analytics</h1>
          <p class="page-desc">
            End-to-end transaction risk monitoring · AI signal detection ·
            Velocity analysis · Geographic threat intelligence
          </p>
        </div>

        <div class="page-header-right">
          <div class="period-control">
            <span class="ctrl-label">ANALYSIS PERIOD</span>
            <div class="period-btns">
              <button
                v-for="d in [7,14,30,90]" :key="d"
                @click="setDays(d)"
                :class="['prd-btn', days===d && 'active']"
              >{{ d }}D</button>
            </div>
          </div>
          <button @click="load" class="refresh-btn" :class="{ spinning: loading }" title="Refresh data">
            ↺
          </button>
        </div>
      </header>

      <!-- Alert banner when fraud rate is high -->
      <div
        v-if="summary && summary.stats.fraud_rate > 0.15"
        class="alert-banner"
        :class="{ 'anim-in': animIn }"
      >
        <span class="alert-icon">⚠</span>
        <span>
          <strong>Elevated Fraud Alert:</strong>
          Fraud rate is at <strong>{{ pct(summary.stats.fraud_rate) }}</strong>
          — {{ fmt(summary.stats.blocked) }} transactions blocked in the last {{ days }} days.
          Immediate review recommended.
        </span>
      </div>

      <!-- ── LOADING ──────────────────────────────────────────────────── -->
      <div v-if="loading" class="load-screen">
        <div class="load-grid">
          <div v-for="i in 16" :key="i" class="load-cell" :style="`animation-delay:${i*0.04}s`"/>
        </div>
        <p class="load-text">FETCHING INTELLIGENCE DATA…</p>
      </div>

      <!-- ── ERROR ────────────────────────────────────────────────────── -->
      <div v-else-if="error" class="error-screen">
        <div class="error-code">ERR_CONNECTION_REFUSED</div>
        <p class="error-msg">{{ error }}</p>
        <button @click="load" class="err-retry">↺ RETRY CONNECTION</button>
      </div>

      <template v-else-if="summary">

        <!-- ── TABS ──────────────────────────────────────────────────── -->
        <nav class="tab-bar" :class="{ 'anim-in': animIn }">
          <button
            v-for="(tab, i) in ['overview','timeseries','users','locations']"
            :key="tab"
            @click="activeTab = tab as Tab"
            :class="['tab', activeTab===tab && 'active']"
            :style="`animation-delay:${0.05 + i * 0.05}s`"
          >
            <span class="tab-glyph">
              {{ tab==='overview' ? '◈' : tab==='timeseries' ? '▲' : tab==='users' ? '◉' : '◎' }}
            </span>
            {{ tab.toUpperCase() }}
          </button>
        </nav>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- OVERVIEW                                                    -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div v-if="activeTab==='overview'" class="tab-body" :class="{ 'anim-in': animIn }">

          <!-- Primary KPI row -->
          <div class="kpi-row">

            <!-- Total -->
            <div class="kpi kpi-base">
              <div class="kpi-top">
                <span class="kpi-label">TOTAL TRANSACTIONS</span>
                <span class="kpi-chip">{{ days }}D</span>
              </div>
              <div class="kpi-num">{{ fmt(summary.stats.total_transactions) }}</div>
              <div class="kpi-spark">
                <svg viewBox="0 0 140 36" class="spark-svg" preserveAspectRatio="none">
                  <path :d="sparkArea('allowed')" class="spark-area allowed-area"/>
                  <path :d="sparkPath('allowed')" class="spark-line allowed-line"/>
                </svg>
              </div>
              <div class="kpi-foot">
                <span class="kpi-sub">Allowed <strong>{{ fmt(summary.stats.allowed) }}</strong></span>
              </div>
            </div>

            <!-- Blocked -->
            <div class="kpi kpi-danger">
              <div class="kpi-top">
                <span class="kpi-label">BLOCKED</span>
                <span class="kpi-chip danger-chip">FRAUD</span>
              </div>
              <div class="kpi-num danger-num">{{ fmt(summary.stats.blocked) }}</div>
              <div class="kpi-progress">
                <div class="kpi-progress-fill danger-fill" :style="{ width: rawPct(summary.stats.fraud_rate) + '%' }"/>
              </div>
              <div class="kpi-foot">
                <span class="kpi-rate danger-rate">{{ pct(summary.stats.fraud_rate) }} fraud rate</span>
                <span :class="['trend-tag', blockTrend > 0 ? 'trend-bad' : 'trend-good']">
                  {{ blockTrend > 0 ? '↑' : '↓' }}{{ Math.abs(blockTrend).toFixed(1) }}% vs prior 7d
                </span>
              </div>
            </div>

            <!-- Reviewed -->
            <div class="kpi kpi-warn">
              <div class="kpi-top">
                <span class="kpi-label">UNDER REVIEW</span>
                <span class="kpi-chip warn-chip">PENDING</span>
              </div>
              <div class="kpi-num warn-num">{{ fmt(summary.stats.reviewed) }}</div>
              <div class="kpi-progress">
                <div class="kpi-progress-fill warn-fill" :style="{ width: rawPct(summary.stats.review_rate) + '%' }"/>
              </div>
              <div class="kpi-foot">
                <span class="kpi-rate warn-rate">{{ pct(summary.stats.review_rate) }} review rate</span>
              </div>
            </div>

            <!-- Flagged Amount -->
            <div class="kpi kpi-accent">
              <div class="kpi-top">
                <span class="kpi-label">FLAGGED EXPOSURE</span>
                <span class="kpi-chip accent-chip">$USD</span>
              </div>
              <div class="kpi-num accent-num kpi-money">{{ shortMoney(summary.stats.total_flagged_amount) }}</div>
              <div class="kpi-spark">
                <svg viewBox="0 0 140 36" class="spark-svg" preserveAspectRatio="none">
                  <path :d="sparkArea('blocked')" class="spark-area danger-area"/>
                  <path :d="sparkPath('blocked')" class="spark-line danger-line"/>
                </svg>
              </div>
              <div class="kpi-foot">
                <span class="kpi-sub">Avg per flag: <strong>{{ money(summary.stats.avg_flagged_amount) }}</strong></span>
              </div>
            </div>
          </div>

          <!-- Secondary panels -->
          <div class="grid-2-1 gap-sm">

            <!-- 14-day stacked chart -->
            <div class="panel">
              <div class="panel-hd">
                <div>
                  <div class="panel-title">14-Day Decision Timeline</div>
                  <div class="panel-sub">Stacked daily outcomes — hover bars for breakdown</div>
                </div>
                <div class="legend">
                  <span class="leg-item"><span class="leg-dot" style="background:#10b981"/><span>ALLOW</span></span>
                  <span class="leg-item"><span class="leg-dot" style="background:#f59e0b"/><span>REVIEW</span></span>
                  <span class="leg-item"><span class="leg-dot" style="background:#ff4444"/><span>BLOCK</span></span>
                </div>
              </div>
              <div class="bar-chart">
                <div
                  v-for="row in sortedTS.slice(-14)"
                  :key="row.date"
                  class="bc-col"
                  @mousemove="showTip($event, `${row.date}\nTotal: ${fmt(row.total)}\nBlocked: ${fmt(row.blocked)} (${blockRatePct(row)}%)\nReviewed: ${fmt(row.reviewed)}\nAllowed: ${fmt(row.allowed)}\nVolume: ${money(row.total_amount)}`)"
                  @mouseleave="hideTip"
                >
                  <div class="bc-stack">
                    <div class="bc-seg bc-blocked"  :style="{ height: `${(row.blocked  / tsMax) * 160}px` }"/>
                    <div class="bc-seg bc-reviewed" :style="{ height: `${(row.reviewed / tsMax) * 160}px` }"/>
                    <div class="bc-seg bc-allowed"  :style="{ height: `${(row.allowed  / tsMax) * 160}px` }"/>
                  </div>
                  <span class="bc-label">{{ row.date.slice(5) }}</span>
                </div>
              </div>
              <!-- Y-axis annotation -->
              <div class="chart-note">
                Peak: <strong>{{ fmt(tsMax) }}</strong> transactions/day
                · Avg block rate: <strong>{{ overallBlockRate.toFixed(1) }}%</strong>
              </div>
            </div>

            <!-- Signal intelligence -->
            <div class="panel">
              <div class="panel-hd">
                <div>
                  <div class="panel-title">Signal Intelligence</div>
                  <div class="panel-sub">Top triggered detection rules</div>
                </div>
              </div>
              <ul class="sig-list">
                <li
                  v-for="(sig, i) in summary.signal_frequency.slice(0, 8)"
                  :key="sig.signal"
                  class="sig-item"
                >
                  <span class="sig-rank">{{ String(i+1).padStart(2,'0') }}</span>
                  <div class="sig-body">
                    <div class="sig-top-row">
                      <span class="sig-name">{{ sig.signal }}</span>
                      <span class="sig-pct">{{ sig.pct }}%</span>
                    </div>
                    <div class="sig-track">
                      <div class="sig-fill" :style="{ width: `${Math.min(sig.pct * 2.5, 100)}%` }"/>
                    </div>
                    <span class="sig-count">{{ fmt(sig.count) }} occurrences</span>
                  </div>
                </li>
                <li v-if="!summary.signal_frequency.length" class="empty-row">No signals recorded in window.</li>
              </ul>
            </div>
          </div>

          <!-- Geographic + User snapshots -->
          <div class="grid-1-1 gap-sm">

            <!-- Geo snapshot -->
            <div class="panel">
              <div class="panel-hd">
                <div>
                  <div class="panel-title">Geographic Threat Map</div>
                  <div class="panel-sub">Risk score by originating location</div>
                </div>
                <button class="panel-nav-btn" @click="activeTab='locations'">VIEW ALL →</button>
              </div>
              <div class="geo-grid">
                <div
                  v-for="loc in summary.location_breakdown.slice(0,6)"
                  :key="loc.location"
                  class="geo-tile"
                  :style="{ '--rc': riskHex(loc.risk_score) }"
                >
                  <div class="geo-tile-top">
                    <span class="geo-flag">{{ countryFlag(loc.location) }}</span>
                    <span class="geo-risk-badge" :style="{ color: riskHex(loc.risk_score), borderColor: riskHex(loc.risk_score)+'40', background: riskHex(loc.risk_score)+'12' }">
                      {{ riskLabel(loc.risk_score) }}
                    </span>
                  </div>
                  <div class="geo-loc-name">{{ loc.location }}</div>
                  <div class="geo-score" :style="{ color: riskHex(loc.risk_score) }">{{ pct(loc.risk_score) }}</div>
                  <div class="geo-meta">
                    <span>{{ fmt(loc.transaction_count) }} txns</span>
                    <span style="color:#ff4444">{{ fmt(loc.blocked_count) }} blocked</span>
                  </div>
                  <div class="geo-bar-track">
                    <div class="geo-bar-fill" :style="{ width: `${loc.risk_score * 100}%`, background: riskHex(loc.risk_score) }"/>
                  </div>
                </div>
              </div>
            </div>

            <!-- User risk snapshot -->
            <div class="panel">
              <div class="panel-hd">
                <div>
                  <div class="panel-title">User Risk Distribution</div>
                  <div class="panel-sub">Classification of {{ topUsers.length }} monitored users</div>
                </div>
                <button class="panel-nav-btn" @click="activeTab='users'">VIEW ALL →</button>
              </div>

              <!-- Tier stats -->
              <div class="tier-row">
                <div class="tier-stat">
                  <div class="tier-circle" style="border-color:#ff444440; background:#ff444410">
                    <span style="color:#ff4444">{{ criticalUsers }}</span>
                  </div>
                  <span class="tier-label">CRITICAL</span>
                  <span class="tier-desc">&gt;60% risk</span>
                </div>
                <div class="tier-divider"/>
                <div class="tier-stat">
                  <div class="tier-circle" style="border-color:#f59e0b40; background:#f59e0b10">
                    <span style="color:#f59e0b">{{ elevatedUsers }}</span>
                  </div>
                  <span class="tier-label">ELEVATED</span>
                  <span class="tier-desc">35–60% risk</span>
                </div>
                <div class="tier-divider"/>
                <div class="tier-stat">
                  <div class="tier-circle" style="border-color:#10b98140; background:#10b98110">
                    <span style="color:#10b981">{{ normalUsers }}</span>
                  </div>
                  <span class="tier-label">NORMAL</span>
                  <span class="tier-desc">&lt;35% risk</span>
                </div>
              </div>

              <!-- Distribution bar -->
              <div class="dist-bar">
                <div class="dist-seg" style="background:#ff4444" :style="{ flex: criticalUsers || 0.01 }" :title="`Critical: ${criticalUsers}`"/>
                <div class="dist-seg" style="background:#f59e0b" :style="{ flex: elevatedUsers || 0.01 }" :title="`Elevated: ${elevatedUsers}`"/>
                <div class="dist-seg" style="background:#10b981" :style="{ flex: normalUsers || 0.01 }" :title="`Normal: ${normalUsers}`"/>
              </div>
              <div class="dist-legend">
                <span><span class="dl-dot" style="background:#ff4444"/>Critical {{ criticalUsers ? ((criticalUsers/topUsers.length)*100).toFixed(0) : 0 }}%</span>
                <span><span class="dl-dot" style="background:#f59e0b"/>Elevated {{ elevatedUsers ? ((elevatedUsers/topUsers.length)*100).toFixed(0) : 0 }}%</span>
                <span><span class="dl-dot" style="background:#10b981"/>Normal {{ normalUsers ? ((normalUsers/topUsers.length)*100).toFixed(0) : 0 }}%</span>
              </div>

              <!-- Top 5 users -->
              <div class="top-users-mini">
                <div class="tum-label">TOP RISK PROFILES</div>
                <div
                  v-for="user in sortedUsers.slice(0,5)"
                  :key="user.user_id"
                  class="tum-row"
                >
                  <div class="tum-avatar" :style="{ background: riskHex(user.risk_score)+'15', color: riskHex(user.risk_score), borderColor: riskHex(user.risk_score)+'30' }">
                    {{ user.user_id.replace('user_','').slice(-2) }}
                  </div>
                  <div class="tum-info">
                    <span class="tum-id">{{ user.user_id }}</span>
                    <span class="tum-meta">{{ user.transaction_count }} txns · {{ shortMoney(user.total_amount) }}</span>
                  </div>
                  <div class="tum-right">
                    <span class="tum-score" :style="{ color: riskHex(user.risk_score) }">{{ pct(user.risk_score) }}</span>
                    <div class="tum-bar">
                      <div :style="{ width: `${user.risk_score * 100}%`, background: riskHex(user.risk_score) }"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- TIMESERIES                                                  -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab==='timeseries'" class="tab-body" :class="{ 'anim-in': animIn }">

          <!-- Stats strip -->
          <div class="stat-strip">
            <div class="ss-item">
              <span class="ss-label">TOTAL VOLUME</span>
              <span class="ss-val">{{ shortMoney(totalVolume) }}</span>
            </div>
            <div class="ss-div"/>
            <div class="ss-item">
              <span class="ss-label">PEAK DAY</span>
              <span class="ss-val">{{ peakDay.date }}</span>
              <span class="ss-sub">{{ fmt(peakDay.total) }} transactions</span>
            </div>
            <div class="ss-div"/>
            <div class="ss-item">
              <span class="ss-label">AVG DAILY BLOCKED</span>
              <span class="ss-val" style="color:#ff4444">{{ fmt(avgDailyBlock) }}</span>
            </div>
            <div class="ss-div"/>
            <div class="ss-item">
              <span class="ss-label">OVERALL BLOCK RATE</span>
              <span class="ss-val" style="color:#ff4444">{{ overallBlockRate.toFixed(1) }}%</span>
            </div>
            <div class="ss-div"/>
            <div class="ss-item">
              <span class="ss-label">DATA POINTS</span>
              <span class="ss-val">{{ sortedTS.length }} days</span>
            </div>
            <div class="ss-div"/>
            <div class="ss-item">
              <span class="ss-label">7D TREND</span>
              <span class="ss-val" :style="{ color: blockTrend > 0 ? '#ff4444' : '#10b981' }">
                {{ blockTrend > 0 ? '↑' : '↓' }}{{ Math.abs(blockTrend).toFixed(1) }}%
              </span>
              <span class="ss-sub">vs prior week</span>
            </div>
          </div>

          <!-- Full bar chart -->
          <div class="panel">
            <div class="panel-hd">
              <div>
                <div class="panel-title">Daily Transaction Volume — {{ days }}-Day Window</div>
                <div class="panel-sub">Stacked allowed / reviewed / blocked · Hover for details</div>
              </div>
              <div class="legend">
                <span class="leg-item"><span class="leg-dot" style="background:#10b981"/><span>ALLOW</span></span>
                <span class="leg-item"><span class="leg-dot" style="background:#f59e0b"/><span>REVIEW</span></span>
                <span class="leg-item"><span class="leg-dot" style="background:#ff4444"/><span>BLOCK</span></span>
              </div>
            </div>
            <div class="big-chart">
              <div
                v-for="row in sortedTS"
                :key="row.date"
                class="bc-col"
                @mousemove="showTip($event, `${row.date}\nTotal: ${fmt(row.total)}\nBlocked: ${fmt(row.blocked)} (${blockRatePct(row)}%)\nReviewed: ${fmt(row.reviewed)}\nAllowed: ${fmt(row.allowed)}\nVolume: ${money(row.total_amount)}`)"
                @mouseleave="hideTip"
              >
                <div class="bc-stack">
                  <div class="bc-seg bc-blocked"  :style="{ height: `${(row.blocked  / tsMax) * 200}px` }"/>
                  <div class="bc-seg bc-reviewed" :style="{ height: `${(row.reviewed / tsMax) * 200}px` }"/>
                  <div class="bc-seg bc-allowed"  :style="{ height: `${(row.allowed  / tsMax) * 200}px` }"/>
                </div>
                <span class="bc-label">{{ row.date.slice(5) }}</span>
              </div>
            </div>
          </div>

          <!-- Data table -->
          <div class="panel">
            <div class="panel-hd">
              <div>
                <div class="panel-title">Daily Breakdown Register</div>
                <div class="panel-sub">{{ sortedTS.length }} data points · Most recent first</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                <tr>
                  <th>DATE</th>
                  <th class="r">TOTAL</th>
                  <th class="r success">ALLOWED</th>
                  <th class="r warn">REVIEWED</th>
                  <th class="r danger">BLOCKED</th>
                  <th>BLOCK RATE</th>
                  <th class="r">VOLUME</th>
                  <th>MIX</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="row in [...sortedTS].reverse()" :key="row.date">
                  <td class="mono muted">{{ row.date }}</td>
                  <td class="r mono">{{ fmt(row.total) }}</td>
                  <td class="r mono success">{{ fmt(row.allowed) }}</td>
                  <td class="r mono warn">{{ fmt(row.reviewed) }}</td>
                  <td class="r mono danger">{{ fmt(row.blocked) }}</td>
                  <td>
                    <div class="rate-cell">
                      <div class="rate-bar"><div :style="{ width: `${row.total?(row.blocked/row.total)*100:0}%` }"/></div>
                      <span class="mono" :class="parseFloat(blockRatePct(row))>20?'danger':'muted'">
                          {{ blockRatePct(row) }}%
                        </span>
                    </div>
                  </td>
                  <td class="r mono muted">{{ shortMoney(row.total_amount) }}</td>
                  <td>
                    <div class="mix-bar">
                      <div style="background:#10b981;opacity:.65" :style="{ flex: row.allowed }"/>
                      <div style="background:#f59e0b" :style="{ flex: row.reviewed }"/>
                      <div style="background:#ff4444" :style="{ flex: row.blocked }"/>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- USERS                                                       -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab==='users'" class="tab-body" :class="{ 'anim-in': animIn }">

          <!-- KPI band -->
          <div class="mini-kpi-row">
            <div class="mk"><span class="mk-label">MONITORED</span><span class="mk-val">{{ fmt(topUsers.length) }}</span><span class="mk-sub">users in window</span></div>
            <div class="mk danger-mk"><span class="mk-label">CRITICAL RISK</span><span class="mk-val" style="color:#ff4444">{{ criticalUsers }}</span><span class="mk-sub">score &gt;60%</span></div>
            <div class="mk warn-mk"><span class="mk-label">ELEVATED RISK</span><span class="mk-val" style="color:#f59e0b">{{ elevatedUsers }}</span><span class="mk-sub">score 35–60%</span></div>
            <div class="mk success-mk"><span class="mk-label">NORMAL</span><span class="mk-val" style="color:#10b981">{{ normalUsers }}</span><span class="mk-sub">score &lt;35%</span></div>
            <div class="mk accent-mk"><span class="mk-label">AVG RISK SCORE</span><span class="mk-val" style="color:#a78bfa">{{ pct(avgRisk) }}</span><span class="mk-sub">population avg</span></div>
            <div class="mk"><span class="mk-label">TOTAL EXPOSURE</span><span class="mk-val" style="color:#a78bfa">{{ shortMoney(topUsers.reduce((a,u)=>a+u.total_amount,0)) }}</span><span class="mk-sub">flagged volume</span></div>
          </div>

          <!-- Sortable table -->
          <div class="panel">
            <div class="panel-hd">
              <div>
                <div class="panel-title">User Risk Register</div>
                <div class="panel-sub">{{ sortedUsers.length }} users · Click headers to sort</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                <tr>
                  <th class="c">#</th>
                  <th>USER ID</th>
                  <th class="r sortable" @click="setUserSort('transaction_count')">
                    TRANSACTIONS <span class="sort-ic">{{ sortIcon('transaction_count') }}</span>
                  </th>
                  <th class="r danger">BLOCKED</th>
                  <th class="r sortable" @click="setUserSort('total_amount')">
                    VOLUME <span class="sort-ic">{{ sortIcon('total_amount') }}</span>
                  </th>
                  <th class="sortable" @click="setUserSort('risk_score')">
                    RISK SCORE <span class="sort-ic">{{ sortIcon('risk_score') }}</span>
                  </th>
                  <th class="c">CLASSIFICATION</th>
                  <th>DECISION SPLIT</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(user,i) in sortedUsers" :key="user.user_id">
                  <td class="c mono muted">{{ String(i+1).padStart(2,'0') }}</td>
                  <td>
                    <div class="user-cell">
                      <div class="u-av" :style="{ background: riskHex(user.risk_score)+'15', color: riskHex(user.risk_score), borderColor: riskHex(user.risk_score)+'35' }">
                        {{ user.user_id.replace('user_','').slice(-2).toUpperCase() }}
                      </div>
                      <span class="mono" style="color:#a5b4fc">{{ user.user_id }}</span>
                    </div>
                  </td>
                  <td class="r mono">{{ fmt(user.transaction_count) }}</td>
                  <td class="r mono danger">{{ fmt(user.blocked_count) }}</td>
                  <td class="r mono muted">{{ money(user.total_amount) }}</td>
                  <td>
                    <div class="score-cell">
                      <div class="sc-track"><div class="sc-fill" :style="{ width:`${user.risk_score*100}%`, background: riskHex(user.risk_score) }"/></div>
                      <span class="mono fw6" :style="{ color: riskHex(user.risk_score) }">{{ pct(user.risk_score) }}</span>
                    </div>
                  </td>
                  <td class="c">
                      <span class="classification" :style="{ color: riskHex(user.risk_score), borderColor: riskHex(user.risk_score)+'40', background: riskHex(user.risk_score)+'12' }">
                        {{ riskLabel(user.risk_score) }}
                      </span>
                  </td>
                  <td>
                    <div class="mix-bar">
                      <div style="background:#10b981;opacity:.65" :style="{ flex: user.transaction_count - user.blocked_count }"/>
                      <div style="background:#ff4444" :style="{ flex: user.blocked_count }"/>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- LOCATIONS                                                   -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div v-else-if="activeTab==='locations'" class="tab-body" :class="{ 'anim-in': animIn }">

          <!-- Top cards -->
          <div class="loc-hero">
            <div
              v-for="loc in locations.slice(0,4)"
              :key="loc.location"
              class="loc-card"
              :style="{ '--rc': riskHex(loc.risk_score) }"
            >
              <div class="lc-header">
                <span class="lc-flag">{{ countryFlag(loc.location) }}</span>
                <span class="lc-badge" :style="{ color: riskHex(loc.risk_score), borderColor: riskHex(loc.risk_score)+'40', background: riskHex(loc.risk_score)+'10' }">
                  {{ riskLabel(loc.risk_score) }}
                </span>
              </div>
              <div class="lc-name">{{ loc.location }}</div>
              <div class="lc-score" :style="{ color: riskHex(loc.risk_score) }">{{ pct(loc.risk_score) }}</div>
              <div class="lc-sub">fraud rate</div>
              <div class="lc-stats">
                <div class="lcs"><span class="lcs-val">{{ fmt(loc.transaction_count) }}</span><span class="lcs-lbl">transactions</span></div>
                <div class="lcs"><span class="lcs-val danger">{{ fmt(loc.blocked_count) }}</span><span class="lcs-lbl">blocked</span></div>
                <div class="lcs"><span class="lcs-val muted">{{ shortMoney(loc.total_amount) }}</span><span class="lcs-lbl">volume</span></div>
              </div>
              <div class="lc-bar-track">
                <div class="lc-bar-fill" :style="{ width: `${loc.risk_score*100}%`, background: riskHex(loc.risk_score) }"/>
              </div>
            </div>
          </div>

          <!-- Horizontal chart -->
          <div class="panel">
            <div class="panel-hd">
              <div>
                <div class="panel-title">Volume Distribution by Location</div>
                <div class="panel-sub">Proportional allowed vs blocked transactions per region</div>
              </div>
              <div class="legend">
                <span class="leg-item"><span class="leg-dot" style="background:#6366f1;opacity:.5"/><span>ALLOWED / REVIEWED</span></span>
                <span class="leg-item"><span class="leg-dot" style="background:#ff4444"/><span>BLOCKED</span></span>
              </div>
            </div>
            <div class="horiz-chart">
              <div v-for="loc in locations" :key="loc.location" class="hc-row"
                   @mousemove="showTip($event, `${loc.location}\nTransactions: ${fmt(loc.transaction_count)}\nBlocked: ${fmt(loc.blocked_count)}\nFraud Rate: ${pct(loc.risk_score)}\nVolume: ${money(loc.total_amount)}`)"
                   @mouseleave="hideTip"
              >
                <div class="hc-label">
                  <span class="hc-flag">{{ countryFlag(loc.location) }}</span>
                  <span class="hc-name">{{ loc.location }}</span>
                </div>
                <div class="hc-bars">
                  <div class="hc-allowed" :style="{ width: `${((loc.transaction_count - loc.blocked_count)/locMax)*100}%` }"/>
                  <div class="hc-blocked" :style="{ width: `${(loc.blocked_count/locMax)*100}%` }"/>
                </div>
                <span class="hc-rate mono fw6" :style="{ color: riskHex(loc.risk_score) }">{{ pct(loc.risk_score) }}</span>
                <span class="hc-count mono muted">{{ fmt(loc.transaction_count) }}</span>
              </div>
            </div>
          </div>

          <!-- Full table -->
          <div class="panel">
            <div class="panel-hd">
              <div>
                <div class="panel-title">Geographic Risk Register</div>
                <div class="panel-sub">All {{ locations.length }} locations · Sorted by fraud rate</div>
              </div>
            </div>
            <div class="table-wrap">
              <table class="dt">
                <thead>
                <tr>
                  <th class="c">#</th>
                  <th>LOCATION</th>
                  <th class="r">TRANSACTIONS</th>
                  <th class="r danger">BLOCKED</th>
                  <th class="r">VOLUME</th>
                  <th>FRAUD RATE</th>
                  <th class="c">RISK LEVEL</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(loc,i) in locations" :key="loc.location">
                  <td class="c mono muted">{{ String(i+1).padStart(2,'0') }}</td>
                  <td>
                    <div class="user-cell">
                      <span style="font-size:1.15rem">{{ countryFlag(loc.location) }}</span>
                      <span class="fw5">{{ loc.location }}</span>
                    </div>
                  </td>
                  <td class="r mono">{{ fmt(loc.transaction_count) }}</td>
                  <td class="r mono danger">{{ fmt(loc.blocked_count) }}</td>
                  <td class="r mono muted">{{ shortMoney(loc.total_amount) }}</td>
                  <td>
                    <div class="score-cell">
                      <div class="sc-track"><div class="sc-fill" :style="{ width:`${loc.risk_score*100}%`, background: riskHex(loc.risk_score) }"/></div>
                      <span class="mono fw6" :style="{ color: riskHex(loc.risk_score) }">{{ pct(loc.risk_score) }}</span>
                    </div>
                  </td>
                  <td class="c">
                      <span class="classification" :style="{ color: riskHex(loc.risk_score), borderColor: riskHex(loc.risk_score)+'40', background: riskHex(loc.risk_score)+'12' }">
                        {{ riskLabel(loc.risk_score) }}
                      </span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </template>
    </div><!-- /main-wrap -->

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- TOOLTIP                                                             -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <div
      v-if="tooltip.visible"
      class="tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <span v-for="(line, i) in tooltip.content.split('\n')" :key="i" class="tip-line">{{ line }}</span>
    </div>

    <!-- FOOTER -->
    <footer class="site-footer">
      <div class="footer-inner">
        <span class="ft-copy">© 2026</span>
        <a href="https://nobleson.info" target="_blank" rel="noopener" class="ft-link">Noble Eselase Vulley</a>
        <span class="ft-sep">·</span>
        <a href="https://africodelab.net" target="_blank" rel="noopener" class="ft-link">AfricodeLab</a>
        <span class="ft-sep">·</span>
        <span class="ft-stack">FastAPI · PostgreSQL · LangChain · FAISS · Tavily · Vue 3 · TypeScript</span>
      </div>
    </footer>
  </div><!-- /shell -->
</template>

<style scoped>
/* ── Fonts ──────────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Archivo:wght@400;500;600;700;800;900&display=swap');

/* ── Design tokens ──────────────────────────────────────────────────────────── */
.shell {
  --bg:       #040507;
  --surface:  #080b0f;
  --card:     #0b0e13;
  --card2:    #0e1117;
  --border:   rgba(255,255,255,0.06);
  --border2:  rgba(255,255,255,0.10);
  --text:     #dde3ed;
  --muted:    #5a6478;
  --dimmed:   #8896ab;
  --danger:   #ff4444;
  --warn:     #f59e0b;
  --success:  #10b981;
  --accent:   #6366f1;
  --purple:   #a78bfa;
  --ff-sans:  'Archivo', system-ui, sans-serif;
  --ff-mono:  'DM Mono', monospace;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--ff-sans);
  position: relative;
  overflow-x: hidden;
}

/* ── Atmosphere ─────────────────────────────────────────────────────────────── */
.grain {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-repeat: repeat; background-size: 256px 256px; opacity: .55;
}
.scanlines {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.04) 2px, rgba(0,0,0,.04) 4px);
}
.glow-orb { position: fixed; pointer-events: none; border-radius: 50%; z-index: 0; }
.glow-1 { width: 700px; height: 700px; top: -200px; left: -100px; background: radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 65%); }
.glow-2 { width: 600px; height: 600px; bottom: -200px; right: -100px; background: radial-gradient(circle, rgba(255,68,68,.05) 0%, transparent 65%); }
.glow-3 { width: 500px; height: 500px; top: 40%; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(16,185,129,.03) 0%, transparent 65%); }

/* ── Topbar ─────────────────────────────────────────────────────────────────── */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 44px; display: flex; align-items: center;
  background: rgba(4,5,7,.90); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 0 24px; gap: 16px;
}
.topbar-left { display: flex; align-items: center; gap: 10px; }
.logo-mark {
  width: 24px; height: 24px; border-radius: 5px;
  background: var(--accent); color: #fff; font-weight: 900;
  font-size: 12px; display: flex; align-items: center; justify-content: center;
  font-family: var(--ff-mono);
}
.brand-name { font-size: 11px; font-weight: 800; letter-spacing: .18em; }
.brand-sub  { font-size: 9px; color: var(--muted); letter-spacing: .1em; margin-left: 8px; }
.topbar-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; }
.topbar-right  { display: flex; align-items: center; gap: 6px; }
.sys-tag {
  font-size: 9px; letter-spacing: .15em; padding: 3px 8px; border-radius: 3px;
  border: 1px solid; font-weight: 700; font-family: var(--ff-mono);
  border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.08); color: var(--success);
}
.sys-tag.threat  { border-color: rgba(255,68,68,.3); background: rgba(255,68,68,.08); color: var(--danger); animation: blink .8s step-end infinite; }
.sys-tag.safe    { border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.08); color: var(--success); }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
.clock-display { font-family: var(--ff-mono); font-size: 13px; font-weight: 500; letter-spacing: .08em; }
.utc-tag { font-size: 8px; color: var(--muted); letter-spacing: .15em; }

/* ── Main wrap ──────────────────────────────────────────────────────────────── */
.main-wrap { position: relative; z-index: 2; max-width: 1440px; margin: 0 auto; padding: 64px 28px 48px; }

/* ── Alert banner ───────────────────────────────────────────────────────────── */
.alert-banner {
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
  padding: 12px 18px; border-radius: 10px;
  background: rgba(255,68,68,.08); border: 1px solid rgba(255,68,68,.25);
  font-size: 13px; color: #fca5a5;
  opacity: 0; transform: translateY(-6px); transition: all .4s .1s;
}
.alert-banner.anim-in { opacity: 1; transform: translateY(0); }
.alert-icon { font-size: 1rem; flex-shrink: 0; color: var(--danger); animation: blink 1.2s step-end infinite; }
.alert-banner strong { color: #fff; }

/* ── Page header ────────────────────────────────────────────────────────────── */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 24px; flex-wrap: wrap; margin-bottom: 28px; padding-top: 20px;
  opacity: 0; transform: translateY(12px); transition: all .5s;
}
.page-header.anim-in { opacity: 1; transform: translateY(0); }
.page-eyebrow {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: .2em; color: var(--accent);
  margin-bottom: 10px; font-family: var(--ff-mono);
}
.pulse-ring { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(16,185,129,.5); display: flex; align-items: center; justify-content: center; position: relative; }
.pulse-dot  { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 6px var(--success); animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(.7);opacity:.6} }
.divider-char { color: var(--muted); }
.period-tag   { color: var(--muted); }
.page-title {
  font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 900; letter-spacing: -.03em;
  line-height: 1; background: linear-gradient(135deg, #fff 30%, #4b5563 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  margin-bottom: 8px;
}
.page-desc { font-size: 12px; color: var(--muted); max-width: 560px; line-height: 1.7; font-family: var(--ff-mono); font-weight: 300; }
.period-control { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
.ctrl-label { font-size: 9px; letter-spacing: .2em; color: var(--muted); font-weight: 600; }
.period-btns { display: flex; gap: 2px; background: rgba(255,255,255,.03); border: 1px solid var(--border); border-radius: 8px; padding: 3px; }
.prd-btn {
  padding: 6px 14px; border-radius: 5px; border: none; cursor: pointer;
  font-family: var(--ff-mono); font-size: 11px; font-weight: 500; letter-spacing: .1em;
  background: transparent; color: var(--muted); transition: all .2s;
}
.prd-btn.active { background: var(--accent); color: #fff; box-shadow: 0 0 16px rgba(99,102,241,.4); }
.prd-btn:not(.active):hover { color: var(--text); background: rgba(255,255,255,.05); }
.page-header-right { display: flex; align-items: center; gap: 12px; }
.refresh-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
  background: rgba(255,255,255,.04); color: var(--dimmed); cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center; transition: all .2s;
}
.refresh-btn:hover { color: var(--text); border-color: var(--border2); }
.refresh-btn.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tabs ───────────────────────────────────────────────────────────────────── */
.tab-bar {
  display: flex; border-bottom: 1px solid var(--border);
  margin-bottom: 28px; gap: 0;
  opacity: 0; transform: translateY(6px); transition: all .4s .15s;
}
.tab-bar.anim-in { opacity: 1; transform: translateY(0); }
.tab {
  display: flex; align-items: center; gap: 7px;
  padding: 11px 20px; background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  cursor: pointer; font-family: var(--ff-sans); font-size: 11px;
  font-weight: 700; letter-spacing: .12em; color: var(--muted); transition: all .2s;
}
.tab:hover { color: var(--dimmed); }
.tab.active { color: var(--text); border-bottom-color: var(--accent); }
.tab-glyph { font-size: 9px; opacity: .5; }

/* ── Loading ────────────────────────────────────────────────────────────────── */
.load-screen { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 120px 0; }
.load-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
.load-cell {
  width: 18px; height: 18px; border-radius: 4px;
  background: rgba(99,102,241,.15);
  animation: load-pulse 1.2s ease-in-out infinite alternate;
}
@keyframes load-pulse { from{opacity:.2;transform:scale(.8)} to{opacity:1;transform:scale(1)} }
.load-text { font-family: var(--ff-mono); font-size: 10px; letter-spacing: .25em; color: var(--muted); }

/* ── Error ──────────────────────────────────────────────────────────────────── */
.error-screen { text-align: center; padding: 80px 0; }
.error-code { font-family: var(--ff-mono); font-size: 14px; color: var(--danger); letter-spacing: .1em; margin-bottom: 10px; }
.error-msg  { font-size: 13px; color: var(--muted); max-width: 380px; margin: 0 auto 24px; font-family: var(--ff-mono); }
.err-retry  { padding: 9px 22px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: var(--text); border-radius: 7px; cursor: pointer; font-size: 11px; letter-spacing: .12em; font-family: var(--ff-mono); transition: all .2s; }
.err-retry:hover { background: rgba(255,255,255,.08); }

/* ── Tab body ───────────────────────────────────────────────────────────────── */
.tab-body { opacity: 0; transform: translateY(10px); transition: all .4s .05s; display: flex; flex-direction: column; gap: 20px; }
.tab-body.anim-in { opacity: 1; transform: translateY(0); }

/* ── KPI row ────────────────────────────────────────────────────────────────── */
.kpi-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
@media(max-width:1100px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px) {.kpi-row{grid-template-columns:1fr}}

.kpi {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; padding: 20px 22px;
  display: flex; flex-direction: column; position: relative; overflow: hidden;
  transition: border-color .25s, transform .25s;
}
.kpi:hover { border-color: var(--border2); transform: translateY(-2px); }
.kpi-danger::after { content:''; position:absolute; inset:0; background:radial-gradient(circle at 80% 0%, rgba(255,68,68,.06) 0%, transparent 60%); pointer-events:none; }
.kpi-warn::after   { content:''; position:absolute; inset:0; background:radial-gradient(circle at 80% 0%, rgba(245,158,11,.06) 0%, transparent 60%); pointer-events:none; }
.kpi-accent::after { content:''; position:absolute; inset:0; background:radial-gradient(circle at 80% 0%, rgba(99,102,241,.07) 0%, transparent 60%); pointer-events:none; }

.kpi-top   { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.kpi-label { font-size:9px; font-weight:700; letter-spacing:.2em; color:var(--muted); }
.kpi-chip  { font-size:8px; padding:2px 7px; border-radius:20px; font-weight:700; letter-spacing:.1em; background:rgba(255,255,255,.07); color:var(--dimmed); }
.danger-chip { background:rgba(255,68,68,.14); color:var(--danger); }
.warn-chip   { background:rgba(245,158,11,.14); color:var(--warn); }
.accent-chip { background:rgba(99,102,241,.14); color:#a5b4fc; }

.kpi-num  { font-size:2.6rem; font-weight:900; letter-spacing:-.03em; line-height:1; margin-bottom:10px; }
.danger-num { color:var(--danger); }
.warn-num   { color:var(--warn); }
.accent-num { color:#a5b4fc; }
.kpi-money  { font-size:1.9rem; }

.kpi-progress { height:3px; background:rgba(255,255,255,.06); border-radius:2px; overflow:hidden; margin-bottom:10px; }
.kpi-progress-fill { height:100%; border-radius:2px; transition:width .9s cubic-bezier(.16,1,.3,1); }
.danger-fill { background:linear-gradient(90deg, var(--danger), #ff8888); }
.warn-fill   { background:linear-gradient(90deg, var(--warn), #fde68a); }

.kpi-spark { margin:4px 0 8px; height:36px; }
.spark-svg { width:100%; height:36px; overflow:visible; }
.spark-line { fill:none; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
.allowed-line  { stroke:#6366f1; }
.danger-line   { stroke:#ff4444; }
.spark-area { transition:opacity .3s; }
.allowed-area  { fill:url(#ga1); opacity:.35; }
.danger-area   { fill:url(#ga2); opacity:.3; }

.kpi-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px; }
.kpi-sub  { font-size:10px; color:var(--muted); font-family:var(--ff-mono); }
.kpi-sub strong { color:var(--dimmed); }
.kpi-rate { font-size:11px; font-weight:600; font-family:var(--ff-mono); }
.danger-rate { color:var(--danger); }
.warn-rate   { color:var(--warn); }
.trend-tag { font-size:9px; font-family:var(--ff-mono); padding:2px 6px; border-radius:3px; }
.trend-bad  { color:var(--danger); background:rgba(255,68,68,.1); }
.trend-good { color:var(--success); background:rgba(16,185,129,.1); }

/* ── Panel ──────────────────────────────────────────────────────────────────── */
.panel { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:22px 24px; }
.panel-hd { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
.panel-title { font-size:13px; font-weight:700; margin-bottom:3px; }
.panel-sub   { font-size:10px; color:var(--muted); font-family:var(--ff-mono); }
.panel-nav-btn { font-size:10px; letter-spacing:.1em; color:var(--accent); background:none; border:none; cursor:pointer; padding-top:2px; transition:opacity .2s; font-family:var(--ff-mono); white-space:nowrap; }
.panel-nav-btn:hover { opacity:.6; }

/* ── Layouts ────────────────────────────────────────────────────────────────── */
.grid-2-1 { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
.grid-1-1 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.gap-sm   { gap:16px; }
@media(max-width:1100px) { .grid-2-1,.grid-1-1 { grid-template-columns:1fr; } }

/* ── Legend ─────────────────────────────────────────────────────────────────── */
.legend { display:flex; align-items:center; gap:14px; font-family:var(--ff-mono); font-size:10px; color:var(--muted); flex-wrap:wrap; }
.leg-item { display:flex; align-items:center; gap:5px; }
.leg-dot  { width:8px; height:8px; border-radius:2px; display:inline-block; }

/* ── Bar chart ──────────────────────────────────────────────────────────────── */
.bar-chart { display:flex; align-items:flex-end; gap:3px; height:190px; overflow-x:auto; padding-bottom:22px; }
.big-chart { display:flex; align-items:flex-end; gap:2px; height:240px; overflow-x:auto; padding-bottom:22px; }
.bc-col { flex:1; min-width:10px; max-width:32px; display:flex; flex-direction:column; align-items:center; cursor:pointer; }
.bc-stack { display:flex; flex-direction:column; justify-content:flex-end; width:100%; gap:1px; }
.bc-seg { width:100%; transition:all .4s; border-radius:2px; min-height:0; }
.bc-blocked  { background:var(--danger); opacity:.8; border-radius:2px 2px 0 0; }
.bc-reviewed { background:var(--warn); opacity:.85; border-radius:0; }
.bc-allowed  { background:rgba(99,102,241,.5); border-radius:0 0 2px 2px; }
.bc-col:hover .bc-seg { opacity:1; filter:brightness(1.15); }
.bc-label { font-size:8px; color:var(--muted); margin-top:4px; font-family:var(--ff-mono); white-space:nowrap; }
.chart-note { margin-top:10px; font-size:10px; color:var(--muted); font-family:var(--ff-mono); }
.chart-note strong { color:var(--dimmed); }

/* ── Signal list ────────────────────────────────────────────────────────────── */
.sig-list { display:flex; flex-direction:column; gap:11px; list-style:none; }
.sig-item { display:flex; align-items:flex-start; gap:10px; }
.sig-rank { width:22px; height:22px; border-radius:5px; flex-shrink:0; background:rgba(255,255,255,.05); color:var(--muted); display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:600; font-family:var(--ff-mono); margin-top:1px; }
.sig-body { flex:1; min-width:0; }
.sig-top-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; gap:6px; }
.sig-name  { font-size:11px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sig-pct   { font-size:10px; color:var(--accent); font-family:var(--ff-mono); font-weight:500; flex-shrink:0; }
.sig-track { height:2px; background:rgba(255,255,255,.06); border-radius:1px; overflow:hidden; margin-bottom:4px; }
.sig-fill  { height:100%; background:linear-gradient(90deg,var(--accent),#818cf8); border-radius:1px; transition:width .8s cubic-bezier(.16,1,.3,1); }
.sig-count { font-size:9px; color:var(--muted); font-family:var(--ff-mono); }
.empty-row { font-size:11px; color:var(--muted); text-align:center; padding:16px 0; }

/* ── Geo tiles ──────────────────────────────────────────────────────────────── */
.geo-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
.geo-tile {
  background:rgba(255,255,255,.025); border:1px solid var(--border); border-radius:10px;
  padding:12px; transition:all .2s; cursor:default; border-left:2px solid var(--rc);
}
.geo-tile:hover { background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.1); }
.geo-tile-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.geo-flag     { font-size:1.4rem; }
.geo-risk-badge { font-size:8px; padding:2px 6px; border-radius:3px; border:1px solid; font-weight:700; letter-spacing:.1em; }
.geo-loc-name { font-size:11px; font-weight:600; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.geo-score    { font-size:1.4rem; font-weight:800; font-family:var(--ff-mono); line-height:1; margin-bottom:4px; }
.geo-meta     { display:flex; gap:8px; font-size:9px; font-family:var(--ff-mono); color:var(--muted); flex-wrap:wrap; margin-bottom:6px; }
.geo-bar-track { height:2px; background:rgba(255,255,255,.06); border-radius:1px; overflow:hidden; }
.geo-bar-fill  { height:100%; border-radius:1px; transition:width .7s; }

/* ── User tier stats ────────────────────────────────────────────────────────── */
.tier-row { display:flex; align-items:center; justify-content:space-around; padding:16px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:14px; }
.tier-stat { text-align:center; }
.tier-circle { width:48px; height:48px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:800; font-family:var(--ff-mono); margin:0 auto 6px; }
.tier-label  { display:block; font-size:9px; letter-spacing:.15em; font-weight:700; color:var(--muted); }
.tier-desc   { display:block; font-size:8px; color:var(--muted); font-family:var(--ff-mono); margin-top:2px; }
.tier-divider { width:1px; height:50px; background:var(--border); }

.dist-bar { display:flex; height:8px; border-radius:4px; overflow:hidden; gap:2px; margin-bottom:10px; }
.dist-seg { height:100%; transition:flex .5s; border-radius:4px; }
.dist-legend { display:flex; gap:14px; font-size:9px; color:var(--muted); font-family:var(--ff-mono); margin-bottom:16px; flex-wrap:wrap; }
.dl-dot { display:inline-block; width:7px; height:7px; border-radius:2px; margin-right:4px; }

/* ── Top users mini ─────────────────────────────────────────────────────────── */
.top-users-mini { border-top:1px solid var(--border); padding-top:14px; }
.tum-label { font-size:9px; letter-spacing:.18em; color:var(--muted); font-weight:700; margin-bottom:10px; }
.tum-row { display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.03); }
.tum-row:last-child { border-bottom:none; }
.tum-avatar { width:30px; height:30px; border-radius:7px; border:1px solid; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; font-family:var(--ff-mono); }
.tum-info { flex:1; min-width:0; }
.tum-id   { display:block; font-size:11px; font-family:var(--ff-mono); color:#a5b4fc; }
.tum-meta { display:block; font-size:9px; color:var(--muted); font-family:var(--ff-mono); }
.tum-right { text-align:right; flex-shrink:0; }
.tum-score { display:block; font-size:11px; font-weight:600; font-family:var(--ff-mono); margin-bottom:3px; }
.tum-bar { width:50px; height:2px; background:rgba(255,255,255,.07); border-radius:1px; overflow:hidden; margin-left:auto; }
.tum-bar div { height:100%; border-radius:1px; }

/* ── Stats strip ────────────────────────────────────────────────────────────── */
.stat-strip { display:flex; align-items:stretch; background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; flex-wrap:wrap; }
.ss-item { padding:18px 24px; flex:1; min-width:120px; }
.ss-label { display:block; font-size:8px; letter-spacing:.2em; font-weight:700; color:var(--muted); margin-bottom:5px; }
.ss-val   { display:block; font-size:1.3rem; font-weight:800; font-family:var(--ff-mono); }
.ss-sub   { display:block; font-size:9px; color:var(--muted); font-family:var(--ff-mono); margin-top:2px; }
.ss-div   { width:1px; background:var(--border); align-self:stretch; flex-shrink:0; }

/* ── Data table ─────────────────────────────────────────────────────────────── */
.table-wrap { overflow-x:auto; }
.dt { width:100%; border-collapse:collapse; font-size:12px; }
.dt th {
  padding:10px 14px; text-align:left; border-bottom:1px solid var(--border);
  font-size:8px; letter-spacing:.18em; font-weight:700; color:var(--muted);
  white-space:nowrap; font-family:var(--ff-mono);
}
.dt th.r { text-align:right; }
.dt th.c { text-align:center; }
.dt th.sortable { cursor:pointer; user-select:none; transition:color .2s; }
.dt th.sortable:hover { color:var(--text); }
.dt th.danger { color:rgba(255,68,68,.7); }
.dt th.warn   { color:rgba(245,158,11,.7); }
.dt th.success{ color:rgba(16,185,129,.7); }
.dt td { padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.03); white-space:nowrap; transition:background .15s; }
.dt tr:hover td { background:rgba(255,255,255,.025); }
.dt tr:last-child td { border-bottom:none; }
.dt td.r { text-align:right; }
.dt td.c { text-align:center; }
.dt .mono   { font-family:var(--ff-mono); }
.dt .muted  { color:var(--dimmed); }
.dt .danger { color:var(--danger); }
.dt .warn   { color:var(--warn); }
.dt .success{ color:var(--success); }
.dt .fw5    { font-weight:500; }
.dt .fw6    { font-weight:600; }
.sort-ic { font-size:9px; opacity:.6; margin-left:3px; }

/* ── Table utility cells ────────────────────────────────────────────────────── */
.rate-cell { display:flex; align-items:center; gap:8px; }
.rate-bar  { width:56px; height:3px; background:rgba(255,255,255,.07); border-radius:2px; overflow:hidden; flex-shrink:0; }
.rate-bar div { height:100%; background:var(--danger); border-radius:2px; }
.mix-bar   { display:flex; height:14px; border-radius:3px; overflow:hidden; min-width:72px; gap:1px; }
.user-cell { display:flex; align-items:center; gap:8px; }
.u-av { width:26px; height:26px; border-radius:6px; border:1px solid; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:700; font-family:var(--ff-mono); }
.score-cell { display:flex; align-items:center; gap:8px; }
.sc-track { width:60px; height:4px; background:rgba(255,255,255,.07); border-radius:2px; overflow:hidden; flex-shrink:0; }
.sc-fill  { height:100%; border-radius:2px; transition:width .6s; }
.classification { display:inline-block; padding:2px 8px; border-radius:3px; border:1px solid; font-size:8px; font-weight:700; letter-spacing:.12em; font-family:var(--ff-mono); }

/* ── Mini KPI row ───────────────────────────────────────────────────────────── */
.mini-kpi-row { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
@media(max-width:1200px){.mini-kpi-row{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px) {.mini-kpi-row{grid-template-columns:repeat(2,1fr)}}
.mk { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:15px 18px; display:flex; flex-direction:column; gap:2px; }
.danger-mk { border-color:rgba(255,68,68,.2); }
.warn-mk   { border-color:rgba(245,158,11,.2); }
.success-mk{ border-color:rgba(16,185,129,.2); }
.accent-mk { border-color:rgba(99,102,241,.2); }
.mk-label { font-size:8px; letter-spacing:.18em; font-weight:700; color:var(--muted); }
.mk-val   { font-size:1.5rem; font-weight:800; font-family:var(--ff-mono); color:var(--text); }
.mk-sub   { font-size:9px; color:var(--muted); font-family:var(--ff-mono); }

/* ── Location hero cards ────────────────────────────────────────────────────── */
.loc-hero { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
@media(max-width:1100px){.loc-hero{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px) {.loc-hero{grid-template-columns:1fr}}
.loc-card {
  background:var(--card); border:1px solid var(--border); border-left:3px solid var(--rc);
  border-radius:14px; padding:20px; transition:transform .2s, box-shadow .2s;
}
.loc-card:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(0,0,0,.5); }
.lc-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.lc-flag   { font-size:2rem; }
.lc-badge  { font-size:8px; padding:3px 7px; border-radius:3px; border:1px solid; font-weight:700; letter-spacing:.1em; font-family:var(--ff-mono); }
.lc-name   { font-size:13px; font-weight:700; margin-bottom:4px; }
.lc-score  { font-size:2rem; font-weight:900; font-family:var(--ff-mono); line-height:1; }
.lc-sub    { font-size:9px; color:var(--muted); letter-spacing:.1em; margin-bottom:12px; margin-top:2px; }
.lc-stats  { display:flex; flex-direction:column; gap:3px; margin-bottom:12px; }
.lcs       { display:flex; justify-content:space-between; font-size:10px; font-family:var(--ff-mono); }
.lcs-val   { font-weight:600; }
.lcs-lbl   { color:var(--muted); }
.lcs-val.danger { color:var(--danger); }
.lcs-val.muted  { color:var(--dimmed); }
.lc-bar-track { height:3px; background:rgba(255,255,255,.06); border-radius:2px; overflow:hidden; }
.lc-bar-fill  { height:100%; border-radius:2px; transition:width .8s; }

/* ── Horizontal chart ───────────────────────────────────────────────────────── */
.horiz-chart { display:flex; flex-direction:column; gap:9px; }
.hc-row   { display:flex; align-items:center; gap:12px; cursor:default; }
.hc-label { width:150px; flex-shrink:0; display:flex; align-items:center; gap:6px; justify-content:flex-end; }
.hc-flag  { font-size:.9rem; flex-shrink:0; }
.hc-name  { font-size:10px; color:var(--dimmed); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:var(--ff-mono); }
.hc-bars  { flex:1; display:flex; height:18px; gap:1px; min-width:0; }
.hc-allowed { border-radius:2px 0 0 2px; background:rgba(99,102,241,.4); min-width:1px; transition:width .7s; }
.hc-blocked { border-radius:0 2px 2px 0; background:var(--danger); min-width:0; transition:width .7s; }
.hc-rate  { width:42px; text-align:right; flex-shrink:0; font-size:11px; font-weight:600; }
.hc-count { width:52px; text-align:right; flex-shrink:0; font-size:10px; }

/* ── Tooltip ────────────────────────────────────────────────────────────────── */
.tooltip {
  position:fixed; z-index:9999; pointer-events:none;
  background:rgba(8,11,16,.95); border:1px solid rgba(255,255,255,.12);
  border-radius:8px; padding:10px 14px; backdrop-filter:blur(12px);
  box-shadow:0 8px 32px rgba(0,0,0,.6);
  display:flex; flex-direction:column; gap:3px;
}
.tip-line { font-size:11px; font-family:var(--ff-mono); color:var(--text); white-space:nowrap; }
.tip-line:first-child { color:#fff; font-weight:600; border-bottom:1px solid rgba(255,255,255,.1); padding-bottom:3px; margin-bottom:2px; }

/* ── Footer ─────────────────────────────────────────────────────────────────── */
.site-footer { position:relative; z-index:2; border-top:1px solid var(--border); padding:24px; margin-top:40px; }
.footer-inner { max-width:1440px; margin:0 auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:center; }
.ft-copy,.ft-stack { font-size:10px; color:var(--muted); font-family:var(--ff-mono); }
.ft-link { font-size:10px; color:var(--dimmed); text-decoration:none; transition:color .2s; font-family:var(--ff-mono); }
.ft-link:hover { color:var(--text); }
.ft-sep { color:var(--muted); font-size:10px; }
.ft-stack { opacity:.5; }
</style>
