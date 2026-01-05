<script setup lang="ts">
// No logic needed for static landing section
</script>

<template>
  <section class="relative overflow-hidden bg-neutral-950 text-white">

    <!-- BACKGROUND GLOW -->
    <div class="pointer-events-none absolute inset-0">
      <div
        class="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full
               bg-indigo-600/20 blur-[120px]"
      />
      <div
        class="absolute bottom-0 right-0 h-[400px] w-[400px]
               bg-fuchsia-600/10 blur-[140px]"
      />
    </div>

    <!-- HERO -->
    <div class="relative max-w-7xl mx-auto px-6 pt-36 pb-28 text-center">
      <span
        class="inline-flex items-center gap-2 rounded-full border border-white/10
               bg-white/5 px-4 py-1.5 text-xs text-gray-300 backdrop-blur"
      >
        AI · RAG · Real-Time Risk Intelligence
      </span>

      <h1
        class="mt-8 text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight
               bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
      >
        AI-Powered Fraud Detection
        <span class="block mt-3 text-indigo-400">
          Built for Modern Financial Systems
        </span>
      </h1>

      <p
        class="mt-10 max-w-3xl mx-auto text-lg leading-relaxed text-gray-400"
      >
        Detect transaction fraud using a hybrid system combining
        <span class="text-gray-200 font-medium">rules-based logic</span>,
        <span class="text-gray-200 font-medium">retrieval-augmented generation (RAG)</span>,
        and
        <span class="text-gray-200 font-medium">large language models</span>
        — all optimized for speed, accuracy, and explainability.
      </p>

      <div class="mt-14 flex flex-wrap justify-center gap-6">
        <RouterLink
          to="/detect"
          class="group relative inline-flex items-center justify-center
                 rounded-xl bg-indigo-600 px-8 py-4 font-semibold
                 transition-all duration-300 hover:bg-indigo-500
                 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.8)]"
        >
          Try Live Detection
          <span
            class="absolute inset-0 rounded-xl ring-1 ring-white/10"
          />
        </RouterLink>

        <RouterLink
          to="/upload"
          class="inline-flex items-center justify-center rounded-xl
                 border border-white/15 bg-white/5 px-8 py-4
                 text-gray-200 transition-all duration-300
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
          <h3 class="feature-title">🔍 RAG-Powered Intelligence</h3>
          <p class="feature-text">
            Vector search across fraud playbooks, regulatory guidance,
            and historical cases enriches every AI decision in real time.
          </p>
        </div>

        <div class="feature-card">
          <h3 class="feature-title">⚡ Real-Time Risk Scoring</h3>
          <p class="feature-text">
            Instantly evaluate transactions using velocity analysis,
            geo-anomaly detection, heuristic rules, and AI reasoning.
          </p>
        </div>

        <div class="feature-card">
          <h3 class="feature-title">📊 Enterprise-Grade Analytics</h3>
          <p class="feature-text">
            Designed for scale with async APIs, PostgreSQL,
            batch ingestion, and extensible dashboards.
          </p>
        </div>
      </div>
    </div>

    <!-- ARCHITECTURE -->
    <div class="relative bg-white/5 py-28 backdrop-blur">
      <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-center text-3xl md:text-4xl font-bold mb-16">
          How It Works
        </h2>

        <div class="grid gap-8 md:grid-cols-4 text-center">
          <div class="step-card">1. Transaction Ingest</div>
          <div class="step-card">2. RAG & Historical Retrieval</div>
          <div class="step-card">3. AI Risk Reasoning</div>
          <div class="step-card">4. Decision & Explanation</div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <footer class="py-16 text-center text-sm text-gray-500">
      Built with FastAPI · PostgreSQL · LangChain · FAISS · Vue 3 · TypeScript
    </footer>
  </section>
</template>

<style scoped>
.feature-card {
  @apply rounded-2xl border border-white/10 bg-white/5 p-8
  transition-all duration-300 hover:-translate-y-1
  hover:border-indigo-400/40 hover:bg-white/10;
}

.feature-title {
  @apply mb-4 text-lg font-semibold text-white;
}

.feature-text {
  @apply text-gray-400 leading-relaxed;
}

.step-card {
  @apply rounded-xl border border-white/10 bg-black/40 px-6 py-8
  font-medium text-gray-300 transition
  hover:border-indigo-400 hover:text-white;
}
</style>
