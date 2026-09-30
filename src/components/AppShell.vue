<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '@/api/http'
import { staffUser, clearStaffToken } from '@/platform/auth'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'

defineOptions({ name: 'AppShell' })
const route = useRoute()
const mobileOpen = ref(false)
watch(() => route.path, () => { mobileOpen.value = false })

// All console routes live under /platform.
const nav: { label: string; items: { to: string; label: string; icon: string; live?: boolean }[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/platform', label: 'Dashboard', icon: 'grid' },
      { to: '/platform/live', label: 'Live Training', icon: 'pulse', live: true },
    ],
  },
  {
    label: 'Detection',
    items: [
      { to: '/platform/transactions', label: 'Transactions', icon: 'list' },
      { to: '/platform/detect', label: 'Detect', icon: 'scan' },
      { to: '/platform/analytics', label: 'Analytics', icon: 'chart' },
    ],
  },
  {
    label: 'Directory',
    items: [{ to: '/platform/users', label: 'Users & Risk', icon: 'user' }],
  },
  {
    label: 'Administration',
    items: [
      { to: '/platform/upload', label: 'Knowledge Base', icon: 'book' },
      { to: '/platform/staff', label: 'Staff & Access', icon: 'users' },
      { to: '/platform/admin', label: 'Admin & Audit', icon: 'shield' },
    ],
  },
  {
    label: 'Partners',
    items: [
      { to: '/platform/subscribers', label: 'Institutions', icon: 'building' },
    ],
  },
]

const isActive = (to: string) =>
  to === '/platform' ? route.path === '/platform' || route.path === '/platform/' : route.path.startsWith(to)
const status = ref<'ok' | 'down' | 'checking'>('checking')

const pageTitle = computed(() => (route.meta.title as string)?.replace('Sentinel — ', '') || 'Console')

const signOut = async () => {
  if (!(await confirm({ title: 'Sign out?', message: 'You’ll need to sign in again to access the console.', confirmLabel: 'Sign out' }))) return
  clearStaffToken(); toast.success('Signed out'); setTimeout(() => window.location.assign('/platform'), 300)
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
    <!-- Mobile backdrop -->
    <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" @click="mobileOpen = false" />

    <!-- Sidebar (static on desktop, drawer on mobile) -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col transform transition-transform duration-200 lg:static lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'">
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
                <span v-if="item.live" class="relative flex h-1.5 w-1.5">
                  <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span v-else class="w-1.5 h-1.5 rounded-full" :class="isActive(item.to) ? 'bg-indigo-300' : 'bg-slate-600'" />
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
      <header class="h-14 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-3 shrink-0">
        <button @click="mobileOpen = true" class="lg:hidden -ml-1 p-1.5 rounded-md text-slate-500 hover:bg-slate-100" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 class="text-sm font-semibold text-slate-800 truncate">{{ pageTitle }}</h1>
        <div class="flex-1" />
        <div class="flex items-center gap-3 sm:gap-4 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :class="status === 'ok' ? 'bg-emerald-500' : status === 'down' ? 'bg-rose-500' : 'bg-amber-400'" />
            <span class="hidden sm:inline">API {{ status === 'ok' ? 'online' : status === 'down' ? 'offline' : '…' }}</span>
          </span>
          <div class="flex items-center gap-2 sm:pl-3 sm:border-l border-slate-200">
            <div class="hidden sm:block text-right leading-tight">
              <div class="text-slate-700 font-medium">{{ staffUser?.name || staffUser?.email || 'Operator' }}</div>
              <div class="text-[10px] uppercase tracking-wide text-slate-400">{{ staffUser?.role || 'staff' }}</div>
            </div>
            <button @click="signOut" class="h-8 px-3 font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
