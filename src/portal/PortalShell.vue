<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PortalProfile } from '@/portal/types'
import { institutionLabel, connectionLabel } from '@/lib/connectivity'
import { toast } from '@/lib/toast'
import Overview from '@/portal/views/Overview.vue'
import PortalTransactions from '@/portal/views/PortalTransactions.vue'
import PortalAnalytics from '@/portal/views/PortalAnalytics.vue'
import PortalDetect from '@/portal/views/PortalDetect.vue'
import Team from '@/portal/views/Team.vue'
import Connection from '@/portal/views/Connection.vue'

const props = defineProps<{ profile: PortalProfile }>()
const emit = defineEmits<{ signout: []; refresh: [PortalProfile] }>()

const nav = [
  { key: 'overview',     label: 'Overview' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'analytics',    label: 'Analytics' },
  { key: 'detect',       label: 'Detect' },
  { key: 'team',         label: 'Team' },
  { key: 'connection',   label: 'Connection & API' },
]
const active = ref('overview')
const mobileOpen = ref(false)
watch(active, () => { mobileOpen.value = false })
const go = (key: string) => { active.value = key }
const signOut = () => { toast.success('Signed out'); emit('signout') }

const views: Record<string, unknown> = {
  overview: Overview, transactions: PortalTransactions, analytics: PortalAnalytics,
  detect: PortalDetect, team: Team, connection: Connection,
}
const current = computed(() => views[active.value])
const inst = computed(() => props.profile.integration)
const me = computed(() => props.profile.user)
const initials = computed(() => {
  const n = me.value?.name || me.value?.email || 'U'
  return n.split(/[ @.]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
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
        <div class="leading-tight min-w-0">
          <div class="text-[14px] font-semibold text-white tracking-tight truncate">{{ inst.partner_name }}</div>
          <div class="text-[10px] uppercase tracking-[0.12em] text-slate-400">Partner Portal</div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <button v-for="item in nav" :key="item.key" @click="go(item.key)"
          class="w-full text-left flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
          :class="active === item.key ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'">
          <span class="w-1.5 h-1.5 rounded-full" :class="active === item.key ? 'bg-indigo-300' : 'bg-slate-600'" />
          {{ item.label }}
        </button>
      </nav>
      <div class="px-4 py-3 border-t border-white/5 text-[11px] text-slate-500">{{ institutionLabel(inst.institution_type) }} · {{ connectionLabel(inst.connection_method) }}</div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-3 shrink-0">
        <button @click="mobileOpen = true" class="lg:hidden -ml-1 p-1.5 rounded-md text-slate-500 hover:bg-slate-100" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 class="text-sm font-semibold text-slate-800 capitalize truncate">{{ nav.find(n => n.key === active)?.label }}</h1>
        <div class="flex-1" />
        <span class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset"
          :class="inst.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'">
          <span class="w-1.5 h-1.5 rounded-full" :class="inst.is_active ? 'bg-emerald-500' : 'bg-rose-500'" />
          {{ inst.is_active ? 'Active' : 'Suspended' }}
        </span>
        <div class="flex items-center gap-2 sm:pl-3 sm:border-l border-slate-200">
          <span class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">{{ initials }}</span>
          <div class="hidden sm:block text-right leading-tight">
            <div class="text-xs text-slate-700 font-medium">{{ me?.name || me?.email }}</div>
            <div class="text-[10px] uppercase tracking-wide text-slate-400">{{ me?.role || 'user' }}</div>
          </div>
          <button @click="signOut" class="h-8 px-3 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Sign out</button>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <component :is="current" :profile="profile" @refresh="(p: PortalProfile) => emit('refresh', p)" />
      </main>
    </div>
  </div>
</template>
