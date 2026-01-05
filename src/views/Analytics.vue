<script setup lang="ts">
import { fraud_stats } from '@/api/analytics.ts'
import type { FraudStats } from '@/types/fraud.ts'
import { onMounted, ref } from 'vue'

const stats = ref<FraudStats | null>(null)
const loading = ref(true)
const error = ref<unknown>(null)

onMounted(async () => {
  try {
    stats.value = await fraud_stats()
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
})
</script>


<template>
  <section class="min-h-screen bg-neutral-950 text-white px-6 py-24">
    <div class="max-w-7xl mx-auto">
      <!-- HEADER -->
      <header class="text-center mb-24">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-300 backdrop-blur"
        >
          Analytics · Risk Intelligence · Decision Support
        </span>

        <h1
          class="mt-8 text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
        >
          Fraud Analytics Dashboard
        </h1>

        <p class="mt-6 max-w-3xl mx-auto text-lg text-gray-400">
          Monitor fraud activity, model behavior, and systemic risk signals across transactions,
          users, geographies, and merchants.
        </p>
      </header>

      <!-- KPI STRIP -->
      <section class="grid gap-6 md:grid-cols-4 mb-20">
        <div class="kpi-card">
          <span class="kpi-label">Total Transactions</span>
          <span class="kpi-value">{{stats?.total_transactions}}</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Fraud Rate</span>
          <span class="kpi-value">{{stats?.fraud_rate}}</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Suspicious Transactions</span>
          <span class="kpi-value">{{stats?.suspicious_transactions}}</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Flagged for Review</span>
          <span class="kpi-value text-yellow-400">~15%</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Blocked Transactions</span>
          <span class="kpi-value text-red-400">~6%</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Avg. Decision Time</span>
          <span class="kpi-value text-indigo-400">&lt; 200ms</span>
        </div>
      </section>

      <!-- ANALYTICS DOMAINS -->
      <section class="grid gap-8 md:grid-cols-3">
        <div class="preview-card">
          <h3>📈 Fraud & Velocity Trends</h3>
          <p>
            Track fraud volume over time, transaction bursts, and velocity-based abuse patterns
            across users and cards.
          </p>

          <ul class="feature-list">
            <li>Transaction spikes</li>
            <li>Rapid merchant hopping</li>
            <li>Time-window aggregation</li>
          </ul>
        </div>

        <div class="preview-card">
          <h3>🎯 Model & Decision Performance</h3>
          <p>
            Measure how the fraud engine behaves in production, including explainability,
            confidence, and decision drift.
          </p>

          <ul class="feature-list">
            <li>Score distributions</li>
            <li>ALLOW / REVIEW / BLOCK ratios</li>
            <li>LLM reasoning audits</li>
          </ul>
        </div>

        <div class="preview-card">
          <h3>🌍 Geographic & Merchant Risk</h3>
          <p>
            Identify high-risk regions, cross-border anomalies, and merchant-level fraud exposure.
          </p>

          <ul class="feature-list">
            <li>Country risk heatmaps</li>
            <li>Merchant clustering</li>
            <li>Cross-border anomalies</li>
          </ul>
        </div>
      </section>

      <!-- ARCHITECTURE NOTE -->
      <section
        class="relative mt-24 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-10 py-16 shadow-[0_0_80px_-40px_rgba(99,102,241,0.4)]"
      >
        <div
          class="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600/10 to-fuchsia-600/10"
        />

        <div class="relative text-center">
          <h2 class="text-3xl font-bold mb-4">Built for Real-World Fraud Operations</h2>

          <p class="text-gray-400 max-w-2xl mx-auto">
            This dashboard will be backed by live PostgreSQL analytics, vector-based knowledge
            retrieval (RAG), and explainable AI outputs from the fraud detection engine.
          </p>

          <div class="mt-10 flex flex-wrap justify-center gap-4">
            <span class="badge">Real-Time Pipelines</span>
            <span class="badge">Explainable AI</span>
            <span class="badge">Audit & Compliance</span>
            <span class="badge">Enterprise Scale</span>
          </div>
        </div>
      </section>

      <!-- FOOTER NOTE -->
      <footer class="mt-24 text-center text-sm text-gray-500">
        Analytics endpoints will be incrementally enabled as data streams and dashboards go live.
      </footer>
    </div>
  </section>
</template>

<style scoped>
.preview-card {
  @apply rounded-2xl border border-white/10 bg-white/5 p-8
  transition-all duration-300
  hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/10;
}

.preview-card h3 {
  @apply mb-3 text-lg font-semibold text-white;
}

.preview-card p {
  @apply text-gray-400 leading-relaxed;
}

.feature-list {
  @apply mt-4 space-y-1 text-sm text-gray-400;
}

.kpi-card {
  @apply rounded-xl border border-white/10 bg-black/40
  px-6 py-5 backdrop-blur;
}

.kpi-label {
  @apply block text-xs uppercase tracking-wide text-gray-400;
}

.kpi-value {
  @apply mt-2 block text-2xl font-bold;
}

.badge {
  @apply rounded-full border border-white/15 bg-black/40
  px-4 py-1.5 text-sm text-gray-300;
}
</style>
