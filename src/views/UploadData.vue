<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  uploadDocument, searchKnowledgeBase, reloadVectorStore, rebuildVectorStore,
  enrichFromWeb, getKnowledgeStats,
  type KnowledgeStats, type SearchResult,
} from '@/api/documents'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatCard from '@/components/ui/StatCard.vue'

defineOptions({ name: 'KnowledgeBaseView' })

const stats = ref<KnowledgeStats | null>(null)
const loadingStats = ref(true)
const toast = ref<{ tone: 'ok' | 'err'; msg: string } | null>(null)
const flash = (tone: 'ok' | 'err', msg: string) => { toast.value = { tone, msg }; setTimeout(() => (toast.value = null), 3500) }

const refreshStats = async () => {
  loadingStats.value = true
  try { stats.value = await getKnowledgeStats() } catch { /* keep prior */ } finally { loadingStats.value = false }
}
onMounted(refreshStats)

// ── Upload ──
const file = ref<File | null>(null)
const uploadPct = ref(0)
const uploading = ref(false)
const onPick = (e: Event) => { file.value = (e.target as HTMLInputElement).files?.[0] ?? null }
const doUpload = async () => {
  if (!file.value) return
  uploading.value = true; uploadPct.value = 0
  try {
    const res = await uploadDocument(file.value, p => (uploadPct.value = p))
    flash('ok', `Uploaded ${res.filename} (${res.size_mb} MB). ${res.note}`)
    file.value = null
    await refreshStats()
  } catch { flash('err', 'Upload failed.') } finally { uploading.value = false }
}

// ── Search ──
const query = ref('')
const results = ref<SearchResult[]>([])
const searching = ref(false)
const searched = ref(false)
const doSearch = async () => {
  if (!query.value.trim()) return
  searching.value = true; searched.value = true
  try { results.value = await searchKnowledgeBase(query.value.trim(), 6) }
  catch { flash('err', 'Search failed.'); results.value = [] } finally { searching.value = false }
}

// ── Enrich ──
const topic = ref('')
const enriching = ref(false)
const doEnrich = async () => {
  if (!topic.value.trim()) return
  enriching.value = true
  try {
    const r = await enrichFromWeb(topic.value.trim(), 5)
    r.status === 'success'
      ? flash('ok', `Fetched ${r.documents_fetched ?? 0} sources on “${r.topic}”.`)
      : flash('err', `No web results for “${r.topic}”.`)
    await refreshStats()
  } catch { flash('err', 'Enrichment failed.') } finally { enriching.value = false }
}

// ── Vector store ──
const busy = ref<'' | 'reload' | 'rebuild'>('')
const doReload = async () => { busy.value = 'reload'; try { await reloadVectorStore(); flash('ok', 'Vector store reloaded.') } catch { flash('err', 'Reload failed.') } finally { busy.value = '' } }
const doRebuild = async () => { busy.value = 'rebuild'; try { await rebuildVectorStore(); flash('ok', 'Vector store rebuilt from all documents.') } catch { flash('err', 'Rebuild failed.') } finally { busy.value = '' } }

const dirs = computed(() => Object.entries(stats.value?.directories || {}))
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Knowledge base</h2>
      <p class="text-sm text-slate-500">The RAG corpus behind the AI analyst — upload fraud intelligence, search it, and keep the vector store fresh.</p>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="rounded-md px-4 py-2.5 text-sm ring-1 ring-inset"
        :class="toast.tone === 'ok' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'">
        {{ toast.msg }}
      </div>
    </transition>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="Documents" :value="stats?.total_documents ?? '—'" tone="indigo" />
      <StatCard v-for="[k, v] in dirs" :key="k" :label="k" :value="v" tone="default" />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Upload -->
      <SectionCard title="Upload document" subtitle="PDF, CSV, TXT, JSON or Markdown">
        <label class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
          <span class="text-slate-400 text-2xl">↑</span>
          <span class="text-sm text-slate-600">{{ file ? file.name : 'Choose a file to add to the corpus' }}</span>
          <span v-if="file" class="text-xs text-slate-400">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
          <input type="file" class="hidden" accept=".pdf,.csv,.txt,.json,.md" @change="onPick" />
        </label>
        <div v-if="uploading" class="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full bg-indigo-500 transition-all" :style="{ width: `${uploadPct}%` }" />
        </div>
        <div class="mt-4 flex justify-end">
          <button @click="doUpload" :disabled="!file || uploading"
            class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {{ uploading ? `Uploading ${uploadPct}%` : 'Upload' }}
          </button>
        </div>
      </SectionCard>

      <!-- Enrich + vector store -->
      <div class="space-y-4">
        <SectionCard title="Enrich from the web" subtitle="Pull live fraud intelligence via Tavily">
          <div class="flex gap-2">
            <input v-model="topic" @keyup.enter="doEnrich" placeholder="e.g. mobile money SIM-swap fraud"
              class="h-9 flex-1 px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            <button @click="doEnrich" :disabled="enriching || !topic.trim()"
              class="h-9 px-4 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap">
              {{ enriching ? 'Fetching…' : 'Enrich' }}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Vector store" subtitle="Reload is fast; rebuild reprocesses every document">
          <div class="flex gap-2">
            <button @click="doReload" :disabled="!!busy"
              class="h-9 flex-1 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {{ busy === 'reload' ? 'Reloading…' : 'Reload' }}
            </button>
            <button @click="doRebuild" :disabled="!!busy"
              class="h-9 flex-1 text-sm font-medium rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50">
              {{ busy === 'rebuild' ? 'Rebuilding…' : 'Rebuild' }}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>

    <!-- Search -->
    <SectionCard title="Search the corpus" subtitle="Semantic search over the FAISS vector store">
      <div class="flex gap-2">
        <input v-model="query" @keyup.enter="doSearch" placeholder="Search fraud patterns, typologies, rules…"
          class="h-9 flex-1 px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        <button @click="doSearch" :disabled="searching || !query.trim()"
          class="h-9 px-5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {{ searching ? 'Searching…' : 'Search' }}
        </button>
      </div>

      <div v-if="searched && !searching" class="mt-4 space-y-2.5">
        <div v-if="!results.length" class="text-sm text-slate-400 py-4 text-center">No matches found.</div>
        <article v-for="(r, i) in results" :key="i" class="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs font-medium text-slate-500 truncate">{{ r.source || 'unknown source' }}</span>
            <span v-if="r.score != null" class="text-[11px] font-semibold text-indigo-600 tabular-nums shrink-0">match {{ (r.score * 100).toFixed(0) }}%</span>
          </div>
          <p class="text-sm text-slate-700 leading-relaxed line-clamp-4">{{ r.content }}</p>
        </article>
      </div>
    </SectionCard>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
</style>
