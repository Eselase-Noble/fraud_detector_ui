<!-- FileUpload.vue — Sentinel Knowledge Base Manager -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  uploadDocument,
  searchKnowledgeBase,
  reloadVectorStore,
  rebuildVectorStore,
  enrichFromWeb,
  getKnowledgeStats,
  type UploadResult,
  type SearchResult,
  type KnowledgeStats,
} from '@/api/documents'

defineOptions({ name: 'FileUpload' })

// ─── State ────────────────────────────────────────────────────────────────────
const file        = ref<File | null>(null)
const uploading   = ref(false)
const uploadPct   = ref(0)
const uploadResult= ref<UploadResult | null>(null)
const uploadError = ref<string | null>(null)
const isDragging  = ref(false)

const stats       = ref<KnowledgeStats | null>(null)
const statsLoading= ref(true)

const searchQuery = ref('')
const searchK     = ref(5)
const searching   = ref(false)
const searchResults = ref<SearchResult[]>([])
const searchError = ref<string | null>(null)
const hasSearched = ref(false)

const enrichTopic = ref('')
const enrichMax   = ref(5)
const enriching   = ref(false)
const enrichMsg   = ref<string | null>(null)
const enrichError = ref<string | null>(null)

const reloadMsg   = ref<string | null>(null)
const rebuildMsg  = ref<string | null>(null)
const opLoading   = ref<'reload' | 'rebuild' | null>(null)

type Panel = 'upload' | 'search' | 'enrich' | 'manage'
const activePanel = ref<Panel>('upload')

// ─── File helpers ─────────────────────────────────────────────────────────────
const ALLOWED = ['.pdf', '.csv', '.txt', '.json', '.md']
const fileExt = computed(() => {
  if (!file.value) return ''
  return '.' + file.value.name.split('.').pop()!.toLowerCase()
})
const fileValid   = computed(() => ALLOWED.includes(fileExt.value))
const fileSizeMB  = computed(() => file.value ? (file.value.size / 1024 / 1024).toFixed(2) : '0')
const fileIcon    = computed(() => {
  const icons: Record<string, string> = { '.pdf': '📄', '.csv': '📊', '.txt': '📝', '.json': '{}', '.md': '📋' }
  return icons[fileExt.value] ?? '📁'
})

const setFile = (f: File | null) => {
  file.value      = f
  uploadResult.value = null
  uploadError.value  = null
  uploadPct.value    = 0
}

const onFileChange = (e: Event) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)

const onDrop = (e: DragEvent) => {
  isDragging.value = false
  const dropped = e.dataTransfer?.files?.[0]
  if (dropped) setFile(dropped)
}

// ─── Upload ───────────────────────────────────────────────────────────────────
const upload = async () => {
  if (!file.value || !fileValid.value) return
  uploading.value    = true
  uploadError.value  = null
  uploadResult.value = null
  uploadPct.value    = 0
  try {
    uploadResult.value = await uploadDocument(file.value, (pct) => { uploadPct.value = pct })
    file.value = null
    await loadStats()
  } catch (err: any) {
    uploadError.value = err?.response?.data?.detail ?? 'Upload failed. Check server logs.'
  } finally {
    uploading.value = false
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const loadStats = async () => {
  statsLoading.value = true
  try { stats.value = await getKnowledgeStats() }
  catch { /* non-critical */ }
  finally { statsLoading.value = false }
}

// ─── Search ───────────────────────────────────────────────────────────────────
const search = async () => {
  if (!searchQuery.value.trim()) return
  searching.value   = true
  searchError.value = null
  hasSearched.value = false
  try {
    searchResults.value = await searchKnowledgeBase(searchQuery.value.trim(), searchK.value)
    hasSearched.value   = true
  } catch (err: any) {
    searchError.value = err?.response?.data?.detail ?? 'Search failed.'
  } finally {
    searching.value = false
  }
}

// ─── Enrich ───────────────────────────────────────────────────────────────────
const enrich = async () => {
  if (!enrichTopic.value.trim()) return
  enriching.value   = true
  enrichError.value = null
  enrichMsg.value   = null
  try {
    const r = await enrichFromWeb(enrichTopic.value.trim(), enrichMax.value)
    enrichMsg.value = r.status === 'success'
      ? `✓ Fetched ${r.documents_fetched} documents for "${r.topic}" — saved to ${r.saved_to}`
      : `No results found for "${r.topic}".`
    await loadStats()
  } catch (err: any) {
    enrichError.value = err?.response?.data?.detail ?? 'Enrichment failed.'
  } finally {
    enriching.value = false
  }
}

// ─── Manage ───────────────────────────────────────────────────────────────────
const reload = async () => {
  opLoading.value = 'reload'
  reloadMsg.value = null
  try {
    const r = await reloadVectorStore()
    reloadMsg.value = r.status
  } catch (err: any) {
    reloadMsg.value = err?.response?.data?.detail ?? 'Reload failed.'
  } finally { opLoading.value = null }
}

const rebuild = async () => {
  opLoading.value  = 'rebuild'
  rebuildMsg.value = null
  try {
    const r = await rebuildVectorStore()
    rebuildMsg.value = r.status
  } catch (err: any) {
    rebuildMsg.value = err?.response?.data?.detail ?? 'Rebuild failed.'
  } finally { opLoading.value = null }
}

onMounted(loadStats)
</script>

<template>
  <div class="shell">
    <!-- Atmosphere -->
    <div class="grain" aria-hidden="true"/>
    <div class="glow-orb glow-1" aria-hidden="true"/>
    <div class="glow-orb glow-2" aria-hidden="true"/>

    <!-- Topbar -->
    <div class="topbar">
      <div class="logo-mark">S</div>
      <span class="brand-name">SENTINEL</span>
      <span class="brand-sep">/</span>
      <span class="brand-section">Knowledge Base</span>
    </div>

    <div class="main-wrap">

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <header class="page-header">
        <div>
          <div class="eyebrow">
            <span class="pulse-dot"/>
            KNOWLEDGE BASE MANAGER
          </div>
          <h1 class="page-title">Intelligence Upload</h1>
          <p class="page-desc">
            Ingest fraud datasets, reference documents, and live web intelligence
            into the FAISS vector store powering RAG-enhanced detection.
          </p>
        </div>

        <!-- Stats sidebar -->
        <div class="stats-sidebar">
          <div class="stats-header">CORPUS STATS</div>
          <div v-if="statsLoading" class="stats-loading">
            <div class="mini-spinner"/><span>Loading…</span>
          </div>
          <template v-else-if="stats">
            <div class="stats-total">
              <span class="stats-big">{{ stats.total_documents }}</span>
              <span class="stats-lbl">total documents</span>
            </div>
            <div class="stats-grid">
              <div v-for="[type, count] in Object.entries(stats.directories)" :key="type" class="stat-pill">
                <span class="sp-type">{{ type.toUpperCase() }}</span>
                <span class="sp-count">{{ count }}</span>
              </div>
            </div>
            <button @click="loadStats" class="refresh-stats-btn">↺ Refresh</button>
          </template>
        </div>
      </header>

      <!-- ── Panel tabs ───────────────────────────────────────────────────── -->
      <nav class="panel-tabs">
        <button
          v-for="p in (['upload','search','enrich','manage'] as Panel[])"
          :key="p"
          @click="activePanel = p"
          :class="['ptab', activePanel === p && 'active']"
        >
          <span class="ptab-icon">
            {{ p==='upload' ? '↑' : p==='search' ? '⌕' : p==='enrich' ? '⊕' : '⚙' }}
          </span>
          {{ p.charAt(0).toUpperCase() + p.slice(1) }}
        </button>
      </nav>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- UPLOAD PANEL                                                       -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-if="activePanel === 'upload'" class="panel-body">

        <div class="two-col">
          <div class="main-col">
            <!-- Drop zone -->
            <div
              class="drop-zone"
              :class="{ dragging: isDragging, 'has-file': !!file, invalid: file && !fileValid }"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="onDrop"
            >
              <input type="file" class="file-input" @change="onFileChange" :accept="ALLOWED.join(',')" />

              <template v-if="!file">
                <div class="dz-icon">↑</div>
                <div class="dz-title">Drop a file here or <span class="dz-link">browse</span></div>
                <div class="dz-formats">
                  <span v-for="ext in ALLOWED" :key="ext" class="fmt-chip">{{ ext.toUpperCase() }}</span>
                </div>
                <div class="dz-limit">Max 50 MB per file</div>
              </template>

              <template v-else>
                <div class="dz-file-icon">{{ fileIcon }}</div>
                <div class="dz-filename">{{ file.name }}</div>
                <div class="dz-file-meta">
                  <span :class="fileValid ? 'meta-ok' : 'meta-bad'">
                    {{ fileExt.toUpperCase() }}
                  </span>
                  <span class="meta-sep">·</span>
                  <span>{{ fileSizeMB }} MB</span>
                  <span v-if="!fileValid" class="meta-bad">· Unsupported type</span>
                </div>
                <button class="dz-clear" @click.stop="setFile(null)">✕ Remove</button>
              </template>
            </div>

            <!-- Upload progress -->
            <div v-if="uploading" class="progress-wrap">
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: uploadPct + '%' }"/>
              </div>
              <span class="progress-label">{{ uploadPct }}%</span>
            </div>

            <!-- Upload button -->
            <button
              @click="upload"
              :disabled="!file || !fileValid || uploading"
              class="upload-btn"
              :class="{ loading: uploading }"
            >
              <span v-if="!uploading">↑ &nbsp;Upload to Knowledge Base</span>
              <span v-else class="btn-loading">
                <span class="btn-spinner"/>
                Uploading {{ uploadPct }}%…
              </span>
            </button>

            <!-- Success -->
            <div v-if="uploadResult" class="result-card success-card">
              <div class="rc-header">
                <span class="rc-status success">✓ UPLOAD SUCCESSFUL</span>
                <span class="rc-size">{{ uploadResult.size_mb }} MB</span>
              </div>
              <div class="rc-row"><span class="rc-lbl">File</span><span class="rc-val">{{ uploadResult.filename }}</span></div>
              <div class="rc-row"><span class="rc-lbl">Saved to</span><span class="rc-val mono">{{ uploadResult.saved_to }}</span></div>
              <div class="rc-note">{{ uploadResult.note }}</div>
            </div>

            <!-- Error -->
            <div v-if="uploadError" class="result-card error-card">
              <div class="rc-header">
                <span class="rc-status danger">⚠ UPLOAD FAILED</span>
              </div>
              <p class="rc-msg">{{ uploadError }}</p>
            </div>
          </div>

          <!-- Sidebar: format guide -->
          <div class="side-col">
            <div class="info-panel">
              <div class="ip-title">Supported Formats</div>
              <ul class="fmt-guide">
                <li>
                  <span class="fg-icon">📊</span>
                  <div>
                    <span class="fg-type">.CSV</span>
                    <span class="fg-desc">Transaction datasets. Auto-indexed into the database and vector store.</span>
                  </div>
                </li>
                <li>
                  <span class="fg-icon">📄</span>
                  <div>
                    <span class="fg-type">.PDF</span>
                    <span class="fg-desc">Compliance docs, fraud reports, regulatory guidelines.</span>
                  </div>
                </li>
                <li>
                  <span class="fg-icon">📝</span>
                  <div>
                    <span class="fg-type">.TXT</span>
                    <span class="fg-desc">Intelligence reports, case notes, threat briefs.</span>
                  </div>
                </li>
                <li>
                  <span class="fg-icon">{}</span>
                  <div>
                    <span class="fg-type">.JSON</span>
                    <span class="fg-desc">Structured rule sets, merchant risk profiles, block lists.</span>
                  </div>
                </li>
                <li>
                  <span class="fg-icon">📋</span>
                  <div>
                    <span class="fg-type">.MD</span>
                    <span class="fg-desc">Runbooks, playbooks, internal analyst documentation.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div class="info-panel">
              <div class="ip-title">What happens after upload?</div>
              <ol class="pipeline-steps">
                <li><span class="ps-num">01</span><span>File saved to <code>data/fraud_docs/{type}/</code></span></li>
                <li><span class="ps-num">02</span><span>CSV rows are bulk-inserted into PostgreSQL</span></li>
                <li><span class="ps-num">03</span><span>FAISS vector store refreshed in the background</span></li>
                <li><span class="ps-num">04</span><span>Document available for RAG queries immediately</span></li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- SEARCH PANEL                                                       -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activePanel === 'search'" class="panel-body">
        <div class="search-header">
          <div class="ip-title">Semantic Search</div>
          <p class="ip-desc">Query the FAISS vector store for relevant knowledge base documents.</p>
        </div>

        <div class="search-bar">
          <input
            v-model="searchQuery"
            @keydown.enter="search"
            placeholder="e.g. impossible travel detection, high-risk merchant categories…"
            class="search-input"
          />
          <div class="search-k-wrap">
            <label class="sk-label">TOP K</label>
            <select v-model.number="searchK" class="sk-select">
              <option v-for="k in [3,5,8,10,15,20]" :key="k" :value="k">{{ k }}</option>
            </select>
          </div>
          <button @click="search" :disabled="!searchQuery.trim() || searching" class="search-btn">
            <span v-if="!searching">⌕ Search</span>
            <span v-else class="btn-loading"><span class="btn-spinner"/>Searching…</span>
          </button>
        </div>

        <div v-if="searchError" class="result-card error-card mt-4">
          <span class="rc-status danger">⚠ {{ searchError }}</span>
        </div>

        <div v-if="hasSearched && !searchResults.length" class="empty-state">
          No matching documents found for <strong>"{{ searchQuery }}"</strong>.
        </div>

        <div v-if="searchResults.length" class="search-results">
          <div class="sr-count">{{ searchResults.length }} results for <strong>"{{ searchQuery }}"</strong></div>
          <div v-for="(r, i) in searchResults" :key="i" class="sr-card">
            <div class="sr-meta">
              <span class="sr-rank">{{ String(i+1).padStart(2,'0') }}</span>
              <span class="sr-source">{{ r.source ?? 'unknown source' }}</span>
              <span v-if="r.score != null" class="sr-score">score {{ r.score.toFixed(4) }}</span>
            </div>
            <p class="sr-content">{{ r.content }}</p>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- ENRICH PANEL                                                       -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activePanel === 'enrich'" class="panel-body">
        <div class="two-col">
          <div class="main-col">
            <div class="ip-title">Live Web Enrichment via Tavily</div>
            <p class="ip-desc">
              Fetch real-time fraud threat intelligence from the web and ingest it
              directly into the knowledge base. Requires <code>TAVILY_API_KEY</code>.
            </p>

            <div class="enrich-form">
              <div class="form-field">
                <label class="field-label">SEARCH TOPIC</label>
                <input
                  v-model="enrichTopic"
                  @keydown.enter="enrich"
                  placeholder="e.g. 2025 crypto fraud patterns, BIN attack techniques…"
                  class="field-input"
                />
              </div>
              <div class="form-field narrow">
                <label class="field-label">MAX RESULTS</label>
                <select v-model.number="enrichMax" class="field-select">
                  <option v-for="n in [3,5,8,10]" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
            </div>

            <button @click="enrich" :disabled="!enrichTopic.trim() || enriching" class="upload-btn">
              <span v-if="!enriching">⊕ &nbsp;Fetch & Ingest Intelligence</span>
              <span v-else class="btn-loading"><span class="btn-spinner"/>Fetching from web…</span>
            </button>

            <div v-if="enrichMsg" class="result-card success-card mt-4">
              <span class="rc-status success">✓ ENRICHMENT COMPLETE</span>
              <p class="rc-msg">{{ enrichMsg }}</p>
            </div>
            <div v-if="enrichError" class="result-card error-card mt-4">
              <span class="rc-status danger">⚠ ENRICHMENT FAILED</span>
              <p class="rc-msg">{{ enrichError }}</p>
            </div>
          </div>

          <div class="side-col">
            <div class="info-panel">
              <div class="ip-title">How it works</div>
              <ol class="pipeline-steps">
                <li><span class="ps-num">01</span><span>Tavily searches the web for your topic</span></li>
                <li><span class="ps-num">02</span><span>Top results are scraped and cleaned</span></li>
                <li><span class="ps-num">03</span><span>Saved as <code>.txt</code> in <code>data/fraud_docs/txt/</code></span></li>
                <li><span class="ps-num">04</span><span>Vector store refreshed — immediately queryable</span></li>
              </ol>
            </div>
            <div class="info-panel warn-panel">
              <div class="ip-title">⚠ Requires Configuration</div>
              <p class="ip-desc">Set <code>TAVILY_API_KEY</code> in your <code>.env</code> file. Without it this endpoint returns 503.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- MANAGE PANEL                                                       -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div v-else-if="activePanel === 'manage'" class="panel-body">
        <div class="manage-grid">

          <div class="manage-card">
            <div class="mc-icon">↺</div>
            <div class="mc-title">Reload Vector Store</div>
            <p class="mc-desc">
              Re-reads the FAISS index from disk without rebuilding it.
              Fast (&lt;1s). Use after a manual file edit or restore.
            </p>
            <button @click="reload" :disabled="opLoading === 'reload'" class="mc-btn">
              <span v-if="opLoading !== 'reload'">Reload Now</span>
              <span v-else class="btn-loading"><span class="btn-spinner"/>Reloading…</span>
            </button>
            <div v-if="reloadMsg" class="mc-msg success">{{ reloadMsg }}</div>
          </div>

          <div class="manage-card warn-card">
            <div class="mc-icon warn">⚙</div>
            <div class="mc-title">Rebuild Vector Store</div>
            <p class="mc-desc">
              Re-embeds and re-indexes <em>all</em> documents from scratch.
              Slow (minutes). Use after bulk document changes or model upgrades.
            </p>
            <button @click="rebuild" :disabled="opLoading === 'rebuild'" class="mc-btn warn-btn">
              <span v-if="opLoading !== 'rebuild'">Full Rebuild</span>
              <span v-else class="btn-loading"><span class="btn-spinner"/>Rebuilding…</span>
            </button>
            <div v-if="rebuildMsg" class="mc-msg success">{{ rebuildMsg }}</div>
          </div>

          <div class="manage-card stats-card">
            <div class="mc-icon accent">◈</div>
            <div class="mc-title">Corpus Summary</div>
            <div v-if="stats" class="mc-stats">
              <div class="mcs-total">{{ stats.total_documents }} <span>documents</span></div>
              <div class="mcs-breakdown">
                <div v-for="[type, count] in Object.entries(stats.directories)" :key="type" class="mcs-row">
                  <span class="mcs-type">{{ type.toUpperCase() }}</span>
                  <div class="mcs-bar-track">
                    <div class="mcs-bar-fill" :style="{ width: stats.total_documents ? `${(count/stats.total_documents)*100}%` : '0%' }"/>
                  </div>
                  <span class="mcs-count">{{ count }}</span>
                </div>
              </div>
            </div>
            <button @click="loadStats" class="mc-btn" :disabled="statsLoading">↺ Refresh Stats</button>
          </div>

        </div>
      </div>

    </div><!-- /main-wrap -->

    <!-- Footer -->
    <footer class="site-footer">
      <span class="ft-copy">© 2026</span>
      <a href="https://nobleson.info" target="_blank" rel="noopener" class="ft-link">Noble Eselase Vulley</a>
      <span class="ft-sep">·</span>
      <a href="https://africodelab.net" target="_blank" rel="noopener" class="ft-link">AfricodeLab</a>
      <span class="ft-sep">·</span>
      <span class="ft-stack">FastAPI · PostgreSQL · LangChain · FAISS · Tavily · Vue 3 · TypeScript</span>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Archivo:wght@400;500;600;700;800;900&display=swap');

.shell {
  --bg:      #040507;
  --card:    #0b0e13;
  --card2:   #0e1117;
  --border:  rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.10);
  --text:    #dde3ed;
  --muted:   #5a6478;
  --dimmed:  #8896ab;
  --danger:  #ff4444;
  --warn:    #f59e0b;
  --success: #10b981;
  --accent:  #6366f1;
  --ff-sans: 'Archivo', system-ui, sans-serif;
  --ff-mono: 'DM Mono', monospace;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--ff-sans);
  position: relative;
  overflow-x: hidden;
}

/* Atmosphere */
.grain {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 256px; opacity: .5;
}
.glow-orb { position: fixed; pointer-events: none; border-radius: 50%; z-index: 0; }
.glow-1 { width: 600px; height: 600px; top: -200px; left: -100px; background: radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 65%); }
.glow-2 { width: 500px; height: 500px; bottom: -100px; right: -100px; background: radial-gradient(circle, rgba(16,185,129,.05) 0%, transparent 65%); }

/* Topbar */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 44px; display: flex; align-items: center; gap: 10px;
  padding: 0 24px;
  background: rgba(4,5,7,.9); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
.logo-mark {
  width: 22px; height: 22px; border-radius: 4px;
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 900;
  display: flex; align-items: center; justify-content: center; font-family: var(--ff-mono);
}
.brand-name    { font-size: 11px; font-weight: 800; letter-spacing: .18em; }
.brand-sep     { color: var(--muted); font-size: 12px; }
.brand-section { font-size: 11px; color: var(--dimmed); font-family: var(--ff-mono); }

/* Main wrap */
.main-wrap { position: relative; z-index: 2; max-width: 1280px; margin: 0 auto; padding: 72px 28px 48px; }

/* Page header */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 32px; flex-wrap: wrap; margin-bottom: 28px; padding-top: 24px;
}
.eyebrow {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: .2em; color: var(--accent);
  margin-bottom: 10px; font-family: var(--ff-mono);
}
.pulse-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--success);
  box-shadow: 0 0 8px var(--success); animation: pd 2s infinite;
}
@keyframes pd { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
.page-title {
  font-size: clamp(2rem,4.5vw,3.2rem); font-weight: 900; letter-spacing: -.03em;
  background: linear-gradient(135deg, #fff 30%, #4b5563 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  margin-bottom: 8px;
}
.page-desc { font-size: 12px; color: var(--muted); max-width: 520px; line-height: 1.7; font-family: var(--ff-mono); font-weight: 300; }

/* Stats sidebar */
.stats-sidebar {
  min-width: 200px; background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; padding: 18px 20px; flex-shrink: 0;
}
.stats-header { font-size: 9px; letter-spacing: .2em; font-weight: 700; color: var(--muted); margin-bottom: 12px; }
.stats-loading { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); font-family: var(--ff-mono); }
.mini-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(99,102,241,.2); border-top-color: var(--accent); animation: spin 1s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.stats-total { margin-bottom: 12px; }
.stats-big  { font-size: 2rem; font-weight: 800; font-family: var(--ff-mono); display: block; }
.stats-lbl  { font-size: 9px; color: var(--muted); letter-spacing: .12em; }
.stats-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.stat-pill  { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; }
.sp-type    { font-size: 8px; font-weight: 700; letter-spacing: .1em; color: var(--muted); font-family: var(--ff-mono); }
.sp-count   { font-size: 12px; font-weight: 700; font-family: var(--ff-mono); }
.refresh-stats-btn { font-size: 10px; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0; letter-spacing: .08em; transition: color .2s; font-family: var(--ff-mono); }
.refresh-stats-btn:hover { color: var(--text); }

/* Panel tabs */
.panel-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 28px; gap: 0; }
.ptab {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 18px; background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  cursor: pointer; font-family: var(--ff-sans); font-size: 11px;
  font-weight: 700; letter-spacing: .12em; color: var(--muted); transition: all .2s;
}
.ptab:hover { color: var(--dimmed); }
.ptab.active { color: var(--text); border-bottom-color: var(--accent); }
.ptab-icon  { font-size: 12px; opacity: .6; }

/* Panel body */
.panel-body { display: flex; flex-direction: column; gap: 18px; }
.two-col { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
.main-col { display: flex; flex-direction: column; gap: 14px; }
.side-col { display: flex; flex-direction: column; gap: 14px; }
@media(max-width:900px) { .two-col { grid-template-columns: 1fr; } }

/* Drop zone */
.drop-zone {
  position: relative; border: 2px dashed rgba(255,255,255,.1);
  border-radius: 14px; background: rgba(255,255,255,.02);
  padding: 48px 24px; text-align: center;
  cursor: pointer; transition: all .25s;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.drop-zone:hover, .drop-zone.dragging { border-color: var(--accent); background: rgba(99,102,241,.05); }
.drop-zone.has-file { border-style: solid; border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.04); }
.drop-zone.invalid  { border-color: rgba(255,68,68,.3) !important; background: rgba(255,68,68,.04) !important; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.dz-icon  { font-size: 2.5rem; color: var(--muted); line-height: 1; }
.dz-title { font-size: 14px; font-weight: 600; }
.dz-link  { color: var(--accent); }
.dz-formats { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.fmt-chip { font-size: 9px; font-weight: 700; letter-spacing: .1em; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,.06); border: 1px solid var(--border); color: var(--dimmed); font-family: var(--ff-mono); }
.dz-limit { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); }
.dz-file-icon { font-size: 2.5rem; }
.dz-filename  { font-size: 13px; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dz-file-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; font-family: var(--ff-mono); color: var(--dimmed); }
.meta-ok  { color: var(--success); font-weight: 600; }
.meta-bad { color: var(--danger); font-weight: 600; }
.meta-sep { color: var(--muted); }
.dz-clear { font-size: 10px; color: var(--muted); background: none; border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-family: var(--ff-mono); transition: all .2s; z-index: 1; position: relative; }
.dz-clear:hover { color: var(--danger); border-color: rgba(255,68,68,.3); }

/* Progress */
.progress-wrap { display: flex; align-items: center; gap: 12px; }
.progress-track { flex: 1; height: 4px; background: rgba(255,255,255,.06); border-radius: 2px; overflow: hidden; }
.progress-fill  { height: 100%; background: linear-gradient(90deg, var(--accent), #818cf8); border-radius: 2px; transition: width .3s; }
.progress-label { font-size: 11px; font-family: var(--ff-mono); color: var(--dimmed); min-width: 32px; text-align: right; }

/* Upload button */
.upload-btn {
  padding: 14px 28px; border-radius: 10px; border: none;
  background: var(--accent); color: #fff; font-weight: 700; font-size: 13px;
  cursor: pointer; letter-spacing: .05em; font-family: var(--ff-sans);
  transition: all .25s; box-shadow: 0 0 0 rgba(99,102,241,0);
}
.upload-btn:hover:not(:disabled) { background: #4f46e5; box-shadow: 0 0 32px rgba(99,102,241,.4); }
.upload-btn:disabled { opacity: .45; cursor: not-allowed; }
.upload-btn.loading { background: rgba(99,102,241,.5); cursor: wait; }
.btn-loading { display: flex; align-items: center; gap: 8px; }
.btn-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; animation: spin 1s linear infinite; flex-shrink: 0; }
.mt-4 { margin-top: 16px; }

/* Result card */
.result-card { border-radius: 10px; border: 1px solid; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; animation: fadein .3s ease; }
.success-card { border-color: rgba(16,185,129,.25); background: rgba(16,185,129,.06); }
.error-card   { border-color: rgba(255,68,68,.25);  background: rgba(255,68,68,.06); }
@keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.rc-header { display: flex; justify-content: space-between; align-items: center; }
.rc-status  { font-size: 10px; font-weight: 700; letter-spacing: .15em; font-family: var(--ff-mono); }
.rc-status.success { color: var(--success); }
.rc-status.danger  { color: var(--danger); }
.rc-size    { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); }
.rc-row     { display: flex; gap: 8px; font-size: 11px; flex-wrap: wrap; }
.rc-lbl     { color: var(--muted); font-family: var(--ff-mono); min-width: 56px; }
.rc-val     { font-family: var(--ff-mono); color: var(--text); }
.rc-val.mono{ font-family: var(--ff-mono); }
.rc-note    { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); }
.rc-msg     { font-size: 11px; color: var(--dimmed); font-family: var(--ff-mono); margin: 0; }

/* Info panels */
.info-panel {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 18px 20px;
}
.warn-panel { border-color: rgba(245,158,11,.2); background: rgba(245,158,11,.04); }
.ip-title   { font-size: 11px; font-weight: 700; letter-spacing: .1em; margin-bottom: 10px; }
.ip-desc    { font-size: 11px; color: var(--muted); font-family: var(--ff-mono); line-height: 1.6; margin: 0; }
.ip-desc code { background: rgba(255,255,255,.06); padding: 1px 5px; border-radius: 4px; font-size: 10px; color: var(--dimmed); }

.fmt-guide  { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.fmt-guide li { display: flex; gap: 10px; align-items: flex-start; }
.fg-icon    { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }
.fg-type    { display: block; font-size: 10px; font-weight: 700; letter-spacing: .1em; font-family: var(--ff-mono); color: var(--dimmed); margin-bottom: 2px; }
.fg-desc    { display: block; font-size: 10px; color: var(--muted); font-family: var(--ff-mono); line-height: 1.5; }

.pipeline-steps { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.pipeline-steps li { display: flex; align-items: flex-start; gap: 10px; font-size: 11px; color: var(--muted); font-family: var(--ff-mono); }
.pipeline-steps code { background: rgba(255,255,255,.06); padding: 1px 5px; border-radius: 4px; font-size: 10px; }
.ps-num { font-size: 9px; font-weight: 700; color: var(--accent); flex-shrink: 0; margin-top: 1px; }

/* Search panel */
.search-header { margin-bottom: 4px; }
.search-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-input {
  flex: 1; min-width: 200px; padding: 11px 14px; border-radius: 10px;
  background: rgba(255,255,255,.04); border: 1px solid var(--border);
  color: var(--text); font-size: 13px; font-family: var(--ff-mono);
  outline: none; transition: border-color .2s;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--muted); }
.search-k-wrap { display: flex; flex-direction: column; gap: 3px; }
.sk-label   { font-size: 8px; letter-spacing: .18em; color: var(--muted); font-weight: 700; }
.sk-select  { padding: 9px 10px; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: var(--ff-mono); font-size: 12px; cursor: pointer; outline: none; }
.search-btn { padding: 11px 22px; border-radius: 10px; border: 1px solid rgba(99,102,241,.4); background: rgba(99,102,241,.12); color: #a5b4fc; font-size: 12px; font-weight: 700; cursor: pointer; letter-spacing: .06em; transition: all .2s; white-space: nowrap; }
.search-btn:hover:not(:disabled) { background: rgba(99,102,241,.22); }
.search-btn:disabled { opacity: .4; cursor: not-allowed; }
.empty-state { text-align: center; padding: 48px 0; font-size: 13px; color: var(--muted); font-family: var(--ff-mono); }
.empty-state strong { color: var(--text); }
.search-results { display: flex; flex-direction: column; gap: 10px; }
.sr-count { font-size: 10px; color: var(--muted); letter-spacing: .1em; font-family: var(--ff-mono); margin-bottom: 4px; }
.sr-count strong { color: var(--text); }
.sr-card {
  background: var(--card); border: 1px solid var(--border); border-radius: 10px;
  padding: 16px 18px; animation: fadein .25s ease;
}
.sr-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.sr-rank  { font-size: 9px; font-weight: 700; color: var(--muted); font-family: var(--ff-mono); width: 20px; }
.sr-source{ font-size: 10px; color: var(--accent); font-family: var(--ff-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.sr-score { font-size: 9px; color: var(--muted); font-family: var(--ff-mono); margin-left: auto; }
.sr-content { font-size: 12px; color: var(--dimmed); font-family: var(--ff-mono); line-height: 1.7; margin: 0; white-space: pre-wrap; overflow-wrap: break-word; }

/* Enrich form */
.enrich-form { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
.form-field.narrow { flex: 0 0 100px; }
.field-label { font-size: 9px; font-weight: 700; letter-spacing: .18em; color: var(--muted); font-family: var(--ff-mono); }
.field-input {
  padding: 11px 14px; border-radius: 10px; background: rgba(255,255,255,.04);
  border: 1px solid var(--border); color: var(--text); font-size: 13px;
  font-family: var(--ff-mono); outline: none; transition: border-color .2s;
}
.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--muted); }
.field-select {
  padding: 11px 12px; background: rgba(255,255,255,.04); border: 1px solid var(--border);
  border-radius: 10px; color: var(--text); font-family: var(--ff-mono); font-size: 12px;
  cursor: pointer; outline: none;
}

/* Manage grid */
.manage-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
@media(max-width:900px){ .manage-grid { grid-template-columns: 1fr; } }
.manage-card {
  background: var(--card); border: 1px solid var(--border); border-radius: 14px;
  padding: 22px; display: flex; flex-direction: column; gap: 10px;
}
.warn-card  { border-color: rgba(245,158,11,.2); }
.stats-card { border-color: rgba(99,102,241,.2); }
.mc-icon { font-size: 1.6rem; }
.mc-icon.warn   { color: var(--warn); }
.mc-icon.accent { color: var(--accent); }
.mc-title { font-size: 14px; font-weight: 700; }
.mc-desc  { font-size: 11px; color: var(--muted); font-family: var(--ff-mono); line-height: 1.6; }
.mc-btn   { padding: 10px 18px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,.05); color: var(--text); font-size: 11px; cursor: pointer; font-family: var(--ff-mono); letter-spacing: .08em; transition: all .2s; margin-top: auto; }
.mc-btn:hover:not(:disabled) { background: rgba(255,255,255,.1); }
.mc-btn:disabled { opacity: .4; cursor: not-allowed; }
.warn-btn { border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.07); color: var(--warn); }
.warn-btn:hover:not(:disabled) { background: rgba(245,158,11,.14); }
.mc-msg   { font-size: 10px; font-family: var(--ff-mono); line-height: 1.5; }
.mc-msg.success { color: var(--success); }
.mc-stats { display: flex; flex-direction: column; gap: 8px; }
.mcs-total { font-size: 1.8rem; font-weight: 800; font-family: var(--ff-mono); }
.mcs-total span { font-size: .9rem; color: var(--muted); font-weight: 400; }
.mcs-breakdown { display: flex; flex-direction: column; gap: 5px; }
.mcs-row  { display: flex; align-items: center; gap: 8px; }
.mcs-type { font-size: 9px; font-weight: 700; letter-spacing: .1em; color: var(--muted); font-family: var(--ff-mono); width: 48px; }
.mcs-bar-track { flex: 1; height: 4px; background: rgba(255,255,255,.06); border-radius: 2px; overflow: hidden; }
.mcs-bar-fill  { height: 100%; background: var(--accent); border-radius: 2px; transition: width .7s; }
.mcs-count { font-size: 11px; font-family: var(--ff-mono); min-width: 20px; text-align: right; }

/* Footer */
.site-footer { position: relative; z-index: 2; border-top: 1px solid var(--border); padding: 24px; margin-top: 40px; text-align: center; }
.ft-copy,.ft-stack { font-size: 10px; color: var(--muted); font-family: var(--ff-mono); }
.ft-link { font-size: 10px; color: var(--dimmed); text-decoration: none; transition: color .2s; font-family: var(--ff-mono); }
.ft-link:hover { color: var(--text); }
.ft-sep { color: var(--muted); font-size: 10px; margin: 0 6px; }
.ft-stack { opacity: .4; }
</style>
