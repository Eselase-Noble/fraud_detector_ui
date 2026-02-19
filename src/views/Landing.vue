<!--Landing.vue-->
<script setup lang="ts">
  defineOptions({
    name: "LandingPage" // Multi-word name
  })
</script>

<template>
  <section class="relative overflow-hidden bg-neutral-950 text-white">

    <!-- BACKGROUND GLOW -->
    <div class="pointer-events-none absolute inset-0">
      <div
        class="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full
               bg-indigo-600/20 blur-[120px]"
      />
      <div class="absolute bottom-0 right-0 h-[400px] w-[400px] bg-fuchsia-600/10 blur-[140px]" />
    </div>

    <!-- HERO -->
    <div class="relative max-w-7xl mx-auto px-6 pt-36 pb-28 text-center">
      <span
        class="inline-flex items-center gap-2 rounded-full border border-white/10
               bg-white/5 px-4 py-1.5 text-xs text-gray-300 backdrop-blur"
      >
        AI · RAG · Live Threat Intelligence · Real-Time Risk Scoring
      </span>

      <h1
        class="mt-8 text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight
               bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
      >
        AI-Powered Fraud Detection
        <span class="block mt-3 text-indigo-400">Built for Modern Financial Systems</span>
      </h1>

      <p class="mt-10 max-w-3xl mx-auto text-lg leading-relaxed text-gray-400">
        Detect transaction fraud using a hybrid system combining
        <span class="text-gray-200 font-medium">rules-based heuristics</span>,
        <span class="text-gray-200 font-medium">retrieval-augmented generation (RAG)</span>,
        <span class="text-gray-200 font-medium">live web threat intelligence</span>,
        and <span class="text-gray-200 font-medium">LLM-powered reasoning</span>
        — optimized for speed, accuracy, and explainability.
      </p>

      <div class="mt-14 flex flex-wrap justify-center gap-6">
        <RouterLink
          to="/detect"
          class="group relative inline-flex items-center justify-center rounded-xl
                 bg-indigo-600 px-8 py-4 font-semibold transition-all duration-300
                 hover:bg-indigo-500 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.8)]"
        >
          Try Live Detection
          <span class="absolute inset-0 rounded-xl ring-1 ring-white/10" />
        </RouterLink>
        <RouterLink
          to="/analytics"
          class="inline-flex items-center justify-center rounded-xl border border-white/15
                 bg-white/5 px-8 py-4 text-gray-200 transition-all duration-300
                 hover:border-indigo-400 hover:bg-white/10"
        >
          View Analytics
        </RouterLink>
        <RouterLink
          to="/upload"
          class="inline-flex items-center justify-center rounded-xl border border-white/15
                 bg-white/5 px-8 py-4 text-gray-200 transition-all duration-300
                 hover:border-indigo-400 hover:bg-white/10"
        >
          Upload Data
        </RouterLink>
      </div>
    </div>

    <!-- FEATURES -->
    <div class="relative max-w-7xl mx-auto px-6 py-28">
      <div class="grid gap-10 md:grid-cols-3">
        <div class="feature-card">
          <h3 class="feature-title">🔍 RAG + Live Intelligence</h3>
          <p class="feature-text">
            Vector search over fraud playbooks and case history — enriched with real-time
            web threat data via Tavily — powers every AI decision.
          </p>
        </div>
        <div class="feature-card">
          <h3 class="feature-title">⚡ Multi-Signal Risk Scoring</h3>
          <p class="feature-text">
            Velocity analysis, impossible travel, device fingerprinting,
            merchant category risk, and geo-anomaly detection in one pass.
          </p>
        </div>
        <div class="feature-card">
          <h3 class="feature-title">📊 Enterprise-Grade Analytics</h3>
          <p class="feature-text">
            Time-series trends, geographic risk matrices, top-risk user leaderboards,
            and signal frequency analysis — all on live PostgreSQL data.
          </p>
        </div>
      </div>
    </div>

    <!-- HOW IT WORKS -->
    <div class="relative bg-white/5 py-28 backdrop-blur">
      <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-center text-3xl md:text-4xl font-bold mb-16">How It Works</h2>
        <div class="grid gap-4 md:grid-cols-5 text-center items-center">
          <div class="step-card">1. Transaction Ingest</div>
          <div class="text-gray-600 text-xl hidden md:block">→</div>
          <div class="step-card">2. RAG + Live Threat Fetch</div>
          <div class="text-gray-600 text-xl hidden md:block">→</div>
          <div class="step-card">3. AI Risk Reasoning</div>
        </div>
        <div class="grid gap-4 md:grid-cols-3 text-center mt-4">
          <div class="step-card">4. Score & Signal Extraction</div>
          <div class="step-card">5. ALLOW / REVIEW / BLOCK</div>
          <div class="step-card">6. Explainable Audit Trail</div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <footer class="py-16 text-center text-sm text-gray-500">
      &copy; 2026
      <a href="https://nobleson.info" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700">
        Noble Eselase Vulley
      </a>
      and
      <a href="https://africodelab.net" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700">
        AfricodeLab
      </a>
      · Built with FastAPI · PostgreSQL · LangChain · FAISS · Tavily · Vue 3 · TypeScript
    </footer>

  </section>
</template>

<style scoped>
.feature-card {
  @apply rounded-2xl border border-white/10 bg-white/5 p-8 transition-all duration-300
  hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/10;
}
.feature-title { @apply mb-4 text-lg font-semibold text-white; }
.feature-text  { @apply text-gray-400 leading-relaxed; }

.step-card {
  @apply rounded-xl border border-white/10 bg-black/40 px-6 py-8
  font-medium text-gray-300 transition hover:border-indigo-400 hover:text-white;
}
</style>
