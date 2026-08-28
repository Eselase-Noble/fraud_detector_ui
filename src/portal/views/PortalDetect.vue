<script setup lang="ts">
import { ref } from 'vue'
import { detect } from '@/portal/api'
import type { FraudResult } from '@/portal/types'
import SectionCard from '@/components/ui/SectionCard.vue'
import DecisionBadge from '@/components/ui/DecisionBadge.vue'
import { toast } from '@/lib/toast'

const blank = () => ({
  transaction_id: '', user_id: '', amount: 0, currency: 'GHS',
  location: '', merchant_category: '', ip_address: '',
})
const txn = ref(blank())
const loading = ref(false)
const error = ref('')
const result = ref<FraudResult | null>(null)

const gaugeTone = (d: string) => d === 'BLOCK' ? 'stroke-rose-500' : d === 'REVIEW' ? 'stroke-amber-500' : 'stroke-emerald-500'

const run = async () => {
  if (!txn.value.user_id.trim() || !txn.value.amount) { error.value = 'User id and amount are required.'; return }
  loading.value = true; error.value = ''; result.value = null
  try {
    result.value = await detect({
      ...txn.value,
      transaction_id: txn.value.transaction_id.trim() || `portal_${Math.floor(txn.value.amount)}_${txn.value.user_id.trim()}`,
    })
    toast.success(`Scored · ${result.value.decision}`)
  } catch { error.value = 'Detection failed — please try again.'; toast.error('Detection failed') } finally { loading.value = false }
}
const sample = () => { txn.value = { transaction_id: '', user_id: 'cust_204', amount: 25000, currency: 'GHS', location: 'Lagos, NG', merchant_category: 'crypto', ip_address: '102.89.44.10' } }
const reset = () => { txn.value = blank(); result.value = null; error.value = '' }
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Detect</h2>
      <p class="text-sm text-slate-500">Score a transaction on demand. Results are saved to your transactions and analytics.</p>
    </div>

    <div class="grid gap-5 lg:grid-cols-5">
      <div class="lg:col-span-3">
        <SectionCard title="Transaction">
          <template #actions><button @click="sample" class="text-xs font-medium text-indigo-600 hover:underline">Load sample</button></template>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="text-xs font-medium text-slate-500">User ID <span class="text-rose-500">*</span></span>
              <input v-model="txn.user_id" placeholder="cust_123" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-slate-500">Amount <span class="text-rose-500">*</span></span>
              <input v-model.number="txn.amount" type="number" min="0" placeholder="0.00" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-slate-500">Currency</span>
              <input v-model="txn.currency" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-slate-500">Location</span>
              <input v-model="txn.location" placeholder="Accra, GH" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-slate-500">Merchant category</span>
              <input v-model="txn.merchant_category" placeholder="retail / crypto / atm…" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-slate-500">IP address</span>
              <input v-model="txn.ip_address" placeholder="102.89.44.10" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </label>
          </div>
          <div v-if="error" class="mt-4 text-sm text-rose-600">{{ error }}</div>
          <div class="mt-5 flex justify-end gap-2">
            <button @click="reset" class="h-9 px-4 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Reset</button>
            <button @click="run" :disabled="loading" class="h-9 px-5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm">{{ loading ? 'Analyzing…' : 'Run detection' }}</button>
          </div>
        </SectionCard>
      </div>

      <div class="lg:col-span-2">
        <SectionCard title="Assessment">
          <div v-if="loading" class="py-12 text-center text-sm text-slate-400">
            <div class="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /><div class="mt-3">Scoring…</div>
          </div>
          <div v-else-if="!result" class="py-12 text-center">
            <div class="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">⌕</div>
            <p class="mt-3 text-sm text-slate-400">Run a detection to see the verdict and reason.</p>
          </div>
          <div v-else class="space-y-4">
            <div class="flex items-center gap-4">
              <div class="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" class="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" class="stroke-slate-100" stroke-width="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke-width="3" stroke-linecap="round" :class="gaugeTone(result.decision)" :stroke-dasharray="`${Math.round(result.score * 100)}, 100`" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-xl font-semibold text-slate-800 tabular-nums">{{ Math.round(result.score * 100) }}</span>
                  <span class="text-[10px] uppercase tracking-wide text-slate-400">risk</span>
                </div>
              </div>
              <div><DecisionBadge :decision="result.decision" size="md" /><div class="mt-2 text-xs text-slate-400">saved to your transactions</div></div>
            </div>
            <div class="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">AI analyst reason</div>
              <p class="mt-1 text-sm text-slate-700 leading-relaxed">{{ result.reason || 'No explanation returned.' }}</p>
            </div>
            <div v-if="result.signals?.length" class="flex flex-wrap gap-1.5">
              <span v-for="s in result.signals" :key="s" class="px-2 py-0.5 text-[11px] rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">{{ s }}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
</template>
