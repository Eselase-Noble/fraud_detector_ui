<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getIntegrations, createIntegration, toggleIntegration, deleteIntegration, rotateIntegrationKey,
  type Integration, type InstitutionType, type ConnectionMethod,
} from '@/api/admin'
import { INSTITUTION_TYPES, CONNECTION_METHODS, institutionLabel, connectionLabel } from '@/lib/connectivity'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatCard from '@/components/ui/StatCard.vue'

defineOptions({ name: 'PartnersView' })

/* Any financial institution — bank, fintech, PSP, MFI, mobile money, SACCO —
   registers here. Each gets an API key, chooses how it feeds transaction data
   (real-time API, batch, database connector or file drop) and which decision
   events it receives on its webhook. Backed by /admin/integrations. */

const EVENTS = ['BLOCK', 'REVIEW', 'ALLOW'] as const
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8099'

const rows = ref<Integration[]>([])
const loading = ref(true)
const error = ref('')

const blankForm = () => ({
  partner_name: '',
  webhook_url: '',
  notify_on: ['BLOCK', 'REVIEW'] as string[],
  institution_type: 'bank' as InstitutionType,
  connection_method: 'rest_api' as ConnectionMethod,
  contact_email: '',
})
const form = ref(blankForm())
const creating = ref(false)
const showForm = ref(false)
const revealed = ref<Record<number, boolean>>({})
const copied = ref<string | null>(null)
// A freshly issued/rotated key, surfaced once for the operator to hand over.
const issued = ref<{ id: number; name: string; key: string } | null>(null)

const load = async () => {
  loading.value = true; error.value = ''
  try { rows.value = await getIntegrations() }
  catch { error.value = 'Could not reach the admin API.' }
  finally { loading.value = false }
}
onMounted(load)

const active = computed(() => rows.value.filter(r => r.is_active).length)

const toggleEvent = (e: string) => {
  const s = new Set(form.value.notify_on)
  s.has(e) ? s.delete(e) : s.add(e)
  form.value.notify_on = [...s]
}

const submit = async () => {
  if (!form.value.partner_name.trim() || !form.value.webhook_url.trim()) return
  creating.value = true
  try {
    const created = await createIntegration({
      partner_name: form.value.partner_name.trim(),
      webhook_url: form.value.webhook_url.trim(),
      notify_on: form.value.notify_on,
      institution_type: form.value.institution_type,
      connection_method: form.value.connection_method,
      contact_email: form.value.contact_email.trim() || null,
    })
    if (created.api_key) issued.value = { id: created.id, name: created.partner_name, key: created.api_key }
    form.value = blankForm()
    showForm.value = false
    await load()
  } catch { error.value = 'Could not register the institution.' }
  finally { creating.value = false }
}

const flip = async (row: Integration) => { await toggleIntegration(row.id).catch(() => {}); await load() }
const revoke = async (row: Integration) => { await deleteIntegration(row.id).catch(() => {}); await load() }
const rotate = async (row: Integration) => {
  const res = await rotateIntegrationKey(row.id).catch(() => null)
  if (res?.api_key) issued.value = { id: res.id, name: res.partner_name, key: res.api_key }
  await load()
}

const maskKey = (k?: string) => (k ? `${k.slice(0, 6)}${'•'.repeat(18)}${k.slice(-4)}` : '—')
const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); copied.value = text; setTimeout(() => (copied.value = null), 1500) } catch { /* clipboard unavailable */ }
}
const when = (s: string | null) => (s ? new Date(s).toLocaleString() : 'never')
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Partner institutions</h2>
        <p class="text-sm text-slate-500 max-w-2xl">Any financial institution — bank, fintech, PSP, microfinance, mobile money or SACCO — that consumes Sentinel. Register one to issue an API key, choose how it sends transaction data, and stream decisions to its webhook.</p>
      </div>
      <div class="flex items-center gap-2">
        <RouterLink to="/portal" class="h-9 inline-flex items-center px-4 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Open partner portal ↗</RouterLink>
        <button @click="showForm = !showForm"
          class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
          {{ showForm ? 'Cancel' : '+ Register institution' }}
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard label="Institutions" :value="rows.length" tone="indigo" />
      <StatCard label="Active" :value="active" tone="emerald" />
      <StatCard label="Suspended" :value="rows.length - active" tone="amber" />
    </div>

    <!-- One-time issued key banner -->
    <div v-if="issued" class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-indigo-900">API key for {{ issued.name }}</div>
          <p class="text-xs text-indigo-700/80 mt-0.5">Shown once. Copy it now and share it securely — it can’t be retrieved again, only rotated.</p>
          <div class="mt-2 flex items-center gap-2">
            <code class="font-mono text-xs bg-white rounded px-2 py-1.5 text-indigo-900 break-all">{{ issued.key }}</code>
            <button @click="copy(issued.key)" class="text-xs font-medium text-indigo-700 hover:underline shrink-0">{{ copied === issued.key ? 'Copied ✓' : 'Copy' }}</button>
          </div>
        </div>
        <button @click="issued = null" class="text-indigo-400 hover:text-indigo-700 text-lg leading-none">×</button>
      </div>
    </div>

    <!-- Detection endpoint -->
    <SectionCard title="Detection endpoint" subtitle="Institutions authenticate to this base URL with their issued key.">
      <div class="flex flex-wrap items-center gap-2">
        <code class="flex-1 min-w-0 truncate rounded-md bg-slate-900 text-slate-100 text-xs font-mono px-3 py-2">POST {{ API_BASE }}/transactions/detect</code>
        <button @click="copy(`${API_BASE}/transactions/detect`)"
          class="h-8 px-3 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">
          {{ copied === `${API_BASE}/transactions/detect` ? 'Copied ✓' : 'Copy' }}
        </button>
      </div>
      <p class="mt-2 text-xs text-slate-400">Header <code class="font-mono text-slate-500">X-API-Key</code> · full connection options (real-time, batch, database, file) are in the <RouterLink to="/portal" class="text-indigo-600 hover:underline">partner portal</RouterLink>.</p>
    </SectionCard>

    <!-- Register form -->
    <SectionCard v-if="showForm" title="Register an institution">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="text-xs font-medium text-slate-500">Institution name</span>
          <input v-model="form.partner_name" placeholder="e.g. Accra Commercial Bank"
            class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-slate-500">Institution type</span>
          <select v-model="form.institution_type"
            class="mt-1 h-9 w-full px-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
            <option v-for="t in INSTITUTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-medium text-slate-500">How they send data</span>
          <select v-model="form.connection_method"
            class="mt-1 h-9 w-full px-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
            <option v-for="m in CONNECTION_METHODS" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-medium text-slate-500">Contact email</span>
          <input v-model="form.contact_email" type="email" placeholder="ops@institution.example"
            class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </label>
        <label class="block sm:col-span-2">
          <span class="text-xs font-medium text-slate-500">Webhook URL</span>
          <input v-model="form.webhook_url" placeholder="https://institution.example/hooks/sentinel"
            class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </label>
      </div>
      <div class="mt-4">
        <span class="text-xs font-medium text-slate-500">Notify on</span>
        <div class="mt-1.5 flex gap-2">
          <button v-for="e in EVENTS" :key="e" type="button" @click="toggleEvent(e)"
            class="px-3 py-1.5 text-xs font-semibold rounded-md ring-1 ring-inset transition-colors"
            :class="form.notify_on.includes(e)
              ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/30'
              : 'bg-white text-slate-400 ring-slate-200 hover:bg-slate-50'">
            {{ e }}
          </button>
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-2">
        <button @click="showForm = false" class="h-9 px-4 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
        <button @click="submit" :disabled="creating || !form.partner_name.trim() || !form.webhook_url.trim()"
          class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {{ creating ? 'Registering…' : 'Register institution' }}
        </button>
      </div>
    </SectionCard>

    <!-- List -->
    <SectionCard title="Registered institutions">
      <template #flush />
      <div v-if="loading" class="p-6 text-sm text-slate-400">Loading institutions…</div>
      <div v-else-if="error" class="p-6 text-sm text-rose-600">{{ error }}</div>
      <div v-else-if="!rows.length" class="p-10 text-center">
        <p class="text-sm text-slate-500">No institutions yet.</p>
        <p class="text-xs text-slate-400 mt-1">Register a partner to issue an API key and start streaming decisions to its webhook.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
              <th class="text-left px-4 py-2.5 font-semibold">Institution</th>
              <th class="text-left px-4 py-2.5 font-semibold">Connection</th>
              <th class="text-left px-4 py-2.5 font-semibold">API key</th>
              <th class="text-left px-4 py-2.5 font-semibold">Events</th>
              <th class="text-left px-4 py-2.5 font-semibold">Last used</th>
              <th class="text-left px-4 py-2.5 font-semibold">Status</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="r in rows" :key="r.id" class="hover:bg-slate-50/60">
              <td class="px-4 py-3">
                <div class="font-medium text-slate-800">{{ r.partner_name }}</div>
                <div class="text-xs text-slate-400">{{ institutionLabel(r.institution_type) }}<span v-if="r.contact_email"> · {{ r.contact_email }}</span></div>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-600">{{ connectionLabel(r.connection_method) }}</span>
                <div class="text-xs text-slate-400 truncate max-w-[180px] mt-1">{{ r.webhook_url }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <code class="font-mono text-xs text-slate-600">{{ revealed[r.id] ? (r.api_key || '— rotate to view —') : maskKey(r.api_key) }}</code>
                  <button v-if="r.api_key" @click="revealed[r.id] = !revealed[r.id]" class="text-[11px] text-indigo-600 hover:underline">{{ revealed[r.id] ? 'hide' : 'show' }}</button>
                </div>
                <button @click="rotate(r)" class="text-[11px] text-slate-400 hover:text-indigo-600 mt-0.5">rotate key</button>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span v-for="e in r.notify_on" :key="e" class="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-500">{{ e }}</span>
                  <span v-if="!r.notify_on?.length" class="text-xs text-slate-300">—</span>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">{{ when(r.last_used_at) }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset"
                  :class="r.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-400/20'">
                  <span class="w-1.5 h-1.5 rounded-full" :class="r.is_active ? 'bg-emerald-500' : 'bg-slate-400'" />
                  {{ r.is_active ? 'Active' : 'Suspended' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button @click="flip(r)" class="text-xs font-medium text-slate-500 hover:text-slate-800 px-2">{{ r.is_active ? 'Suspend' : 'Activate' }}</button>
                <button @click="revoke(r)" class="text-xs font-medium text-rose-600 hover:text-rose-700 px-2">Revoke</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  </div>
</template>
