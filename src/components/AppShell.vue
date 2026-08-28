<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '@/api/http'

defineOptions({ name: 'AppShell' })
const route = useRoute()

const nav = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'grid' }],
  },
  {
    label: 'Detection',
    items: [
      { to: '/transactions', label: 'Transactions', icon: 'list' },
      { to: '/detect', label: 'Detect', icon: 'scan' },
      { to: '/analytics', label: 'Analytics', icon: 'chart' },
    ],
  },
  {
    label: 'Directory',
    items: [{ to: '/users', label: 'Users & Risk', icon: 'user' }],
  },
  {
    label: 'Administration',
    items: [
      { to: '/upload', label: 'Knowledge Base', icon: 'book' },
      { to: '/admin', label: 'Admin & Audit', icon: 'shield' },
    ],
  },
]

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const title = ref('')
const status = ref<'ok' | 'down' | 'checking'>('checking')

const paths: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/detect': 'Detect Fraud',
  '/analytics': 'Analytics',
  '/users': 'Users & Risk',
  '/upload': 'Knowledge Base',
  '/admin': 'Admin & Audit',
}

const checkHealth = async () => {
  try {
    await http.get('/health')
    status.value = 'ok'
  } catch {
    status.value = 'down'
  }
}

onMounted(() => {
  checkHealth()
  setInterval(checkHealth, 30000)
})
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 text-slate-800">
    <!-- Sidebar -->
    <aside class="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
      <div class="h-14 flex items-center gap-2.5 px-4 border-b border-white/5">
        <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-sky-500 text-white font-bold">S</span>
        <div class="leading-tight">
          <div class="text-[15px] font-semibold text-white tracking-tight">Sentinel</div>
          <div class="text-[10px] uppercase tracking-[0.14em] text-slate-400">Fraud Intelligence</div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto py-3">
        <div v-for="group in nav" :key="group.label" class="mb-1">
          <div class="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{{ group.label }}</div>
          <ul class="px-2 space-y-0.5">
            <li v-for="item in group.items" :key="item.to">
              <RouterLink
                :to="item.to"
                class="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
                :class="isActive(item.to) ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="isActive(item.to) ? 'bg-indigo-300' : 'bg-slate-600'" />
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>
      <div class="px-4 py-3 border-t border-white/5 text-[11px] text-slate-500">© AfricodeLab · Sentinel</div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
        <h1 class="text-sm font-semibold text-slate-800">{{ paths[route.path] || 'Sentinel' }}</h1>
        <div class="flex-1" />
        <div class="flex items-center gap-4 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :class="status === 'ok' ? 'bg-emerald-500' : status === 'down' ? 'bg-rose-500' : 'bg-amber-400'" />
            API {{ status === 'ok' ? 'online' : status === 'down' ? 'offline' : '…' }}
          </span>
          <span class="hidden sm:inline text-slate-400">AI fraud engine · gpt-4.1 + RAG</span>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
