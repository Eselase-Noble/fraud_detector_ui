<script setup lang="ts">
import { computed, ref } from 'vue'
import { updateConfig, detect } from '@/portal/api'
import { CONNECTION_METHODS } from '@/lib/connectivity'
import type { PortalProfile, FraudResult } from '@/portal/types'
import SectionCard from '@/components/ui/SectionCard.vue'
import DecisionBadge from '@/components/ui/DecisionBadge.vue'
import { toast } from '@/lib/toast'

const props = defineProps<{ profile: PortalProfile }>()
const emit = defineEmits<{ refresh: [PortalProfile] }>()

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8099'
const EVENTS = ['BLOCK', 'REVIEW', 'ALLOW'] as const
const inst = computed(() => props.profile.integration)
const isAdmin = computed(() => !props.profile.user || props.profile.user.role === 'admin')

// Guide
const activeTab = ref<string>(inst.value.connection_method)
const activeMethod = computed(() => CONNECTION_METHODS.find(m => m.value === activeTab.value) ?? CONNECTION_METHODS[0]!)
const sample = computed(() => activeMethod.value.sample(API_BASE, ''))
const copied = ref<string | null>(null)
const copy = async (text: string, tag: string) => { try { await navigator.clipboard.writeText(text); copied.value = tag; setTimeout(() => (copied.value = null), 1500) } catch { /* */ } }

// Webhook + events
const webhookDraft = ref(inst.value.webhook_url)
const eventsDraft = ref<string[]>([...inst.value.notify_on])
const savingCfg = ref(false)
const cfgMsg = ref('')
const cfgDirty = computed(() =>
  webhookDraft.value !== inst.value.webhook_url ||
  JSON.stringify([...eventsDraft.value].sort()) !== JSON.stringify([...inst.value.notify_on].sort()),
)
const toggleEvent = (e: string) => { const s = new Set(eventsDraft.value); s.has(e) ? s.delete(e) : s.add(e); eventsDraft.value = [...s] }
const saveConfig = async () => {
  savingCfg.value = true; cfgMsg.value = ''
  try {
    const updated = await updateConfig({ webhook_url: webhookDraft.value.trim(), notify_on: eventsDraft.value })
    emit('refresh', { ...props.profile, integration: updated })
    cfgMsg.value = 'Saved.'; toast.success('Connection settings saved'); setTimeout(() => (cfgMsg.value = ''), 2500)
  } catch { cfgMsg.value = 'Save failed.'; toast.error('Save failed') } finally { savingCfg.value = false }
}

// Test
const testing = ref(false)
const testResult = ref<FraudResult | null>(null)
const testError = ref('')
const runTest = async () => {
  testing.value = true; testError.value = ''; testResult.value = null
  try {
    testResult.value = await detect({ transaction_id: `conntest_${inst.value.id}`, user_id: 'portal_test_user', amount: 25000, currency: 'GHS', location: 'Accra, GH', merchant_category: 'crypto', ip_address: '102.89.44.10' })
    toast.success(`Connection OK · decision ${testResult.value.decision}`)
  } catch { testError.value = 'Test call failed — check the endpoint is reachable.'; toast.error('Test call failed') } finally { testing.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Connection &amp; API</h2>
      <p class="text-sm text-slate-500">How to send transaction data to Sentinel, and where we return decisions.</p>
    </div>

    <SectionCard title="How to connect your transaction data" subtitle="Four ways to send transactions. Your configured method is highlighted.">
      <div class="flex flex-wrap gap-2 mb-4">
        <button v-for="m in CONNECTION_METHODS" :key="m.value" @click="activeTab = m.value"
          class="px-3 py-1.5 text-xs font-semibold rounded-md ring-1 ring-inset transition-colors"
          :class="activeTab === m.value ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'">
          {{ m.label }}<span v-if="m.value === inst.connection_method" class="ml-1 opacity-80">• yours</span>
        </button>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-1 space-y-3">
          <p class="text-sm text-slate-700 leading-relaxed">{{ activeMethod.description }}</p>
          <dl class="text-xs space-y-1.5">
            <div class="flex justify-between gap-2"><dt class="text-slate-400">Latency</dt><dd class="text-slate-600 text-right">{{ activeMethod.latency }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-slate-400">Best for</dt><dd class="text-slate-600 text-right">{{ activeMethod.bestFor }}</dd></div>
          </dl>
        </div>
        <div class="lg:col-span-2">
          <div class="rounded-lg bg-slate-900 overflow-hidden">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
              <span class="text-[11px] font-mono uppercase tracking-wide text-slate-400">{{ sample.lang }}</span>
              <button @click="copy(sample.code, 'sample')" class="text-[11px] font-medium text-slate-300 hover:text-white">{{ copied === 'sample' ? 'Copied ✓' : 'Copy' }}</button>
            </div>
            <pre class="p-3 text-[11.5px] leading-relaxed text-slate-100 overflow-x-auto font-mono">{{ sample.code }}</pre>
          </div>
        </div>
      </div>
    </SectionCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Credentials" subtitle="Authenticate every API request with this header.">
        <div class="rounded-md bg-slate-50 border border-slate-100 p-3 font-mono text-xs text-slate-700">X-API-Key: <span class="text-slate-400">•••• (your issued key)</span></div>
        <p class="mt-2 text-xs text-slate-400">API keys are shown only once, at issue or rotation. If yours is lost or exposed, ask your Sentinel operator to rotate it.</p>
        <div class="mt-3 flex items-center gap-2">
          <code class="flex-1 truncate rounded bg-slate-900 text-slate-100 text-xs font-mono px-2 py-1.5">{{ API_BASE }}/transactions/detect</code>
          <button @click="copy(`${API_BASE}/transactions/detect`, 'ep')" class="text-xs font-medium text-indigo-600 hover:underline shrink-0">{{ copied === 'ep' ? '✓' : 'Copy' }}</button>
        </div>
      </SectionCard>

      <SectionCard title="Webhook &amp; notifications" subtitle="Where we POST decisions, and which ones.">
        <label class="block"><span class="text-xs font-medium text-slate-500">Webhook URL</span>
          <input v-model="webhookDraft" :disabled="!isAdmin" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400" /></label>
        <div class="mt-3">
          <span class="text-xs font-medium text-slate-500">Notify on</span>
          <div class="mt-1.5 flex gap-2">
            <button v-for="e in EVENTS" :key="e" type="button" :disabled="!isAdmin" @click="toggleEvent(e)"
              class="px-3 py-1.5 text-xs font-semibold rounded-md ring-1 ring-inset transition-colors disabled:opacity-60"
              :class="eventsDraft.includes(e) ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/30' : 'bg-white text-slate-400 ring-slate-200 hover:bg-slate-50'">{{ e }}</button>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2">
          <span v-if="cfgMsg" class="text-xs" :class="cfgMsg === 'Saved.' ? 'text-emerald-600' : 'text-rose-600'">{{ cfgMsg }}</span>
          <button v-if="isAdmin" @click="saveConfig" :disabled="!cfgDirty || savingCfg" class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{{ savingCfg ? 'Saving…' : 'Save changes' }}</button>
        </div>
        <p v-if="!isAdmin" class="text-xs text-slate-400 text-right">Only admins can change connection settings.</p>
      </SectionCard>
    </div>

    <SectionCard title="Test your connection" subtitle="Sends a sample transaction to the detect endpoint.">
      <template #actions><button @click="runTest" :disabled="testing" class="h-8 px-4 text-xs font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">{{ testing ? 'Testing…' : 'Run test call' }}</button></template>
      <div v-if="testError" class="text-sm text-rose-600">{{ testError }}</div>
      <div v-else-if="testResult" class="flex flex-wrap items-center gap-4">
        <DecisionBadge :decision="testResult.decision" size="md" />
        <div class="text-sm text-slate-600">Risk score <span class="font-semibold text-slate-800">{{ Math.round(testResult.score * 100) }}</span></div>
        <div class="text-sm text-slate-500 flex-1 min-w-[200px]">{{ testResult.reason }}</div>
      </div>
      <p v-else class="text-sm text-slate-400">Run a test call to confirm your connection works end-to-end.</p>
    </SectionCard>
  </div>
</template>
