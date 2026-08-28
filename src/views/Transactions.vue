<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAllTransactions, detectFraud } from '@/api/transactions'
import type { Transaction, FraudResult } from '@/types/fraud'

defineOptions({ name: 'TransactionsView' })

const rows = ref<Transaction[]>([])
const loading = ref(true)
const decision = ref<'' | 'ALLOW' | 'REVIEW' | 'BLOCK'>('')
const userId = ref('')
const selected = ref<Transaction | null>(null)
const verdict = ref<FraudResult | null>(null)
const assessing = ref(false)

const money = (n = 0, c = 'GHS') => `${c} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const decTone: Record<string, string> = {
  BLOCK: 'bg-rose-50 text-rose-700 ring-rose-200',
  REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  ALLOW: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const load = async () => {
  loading.value = true
  try {
    rows.value = await getAllTransactions({
      limit: 100,
      decision: decision.value || undefined,
      user_id: userId.value.trim() || undefined,
    })
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

const openRow = async (t: Transaction) => {
  selected.value = t
  verdict.value = null
  assessing.value = true
  try {
    verdict.value = await detectFraud(t)
  } catch {
    verdict.value = null
  } finally {
    assessing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Transactions</h2>
      <p class="text-sm text-slate-500">Every transaction assessed by Sentinel. Filter by verdict or user, click a row to re-assess.</p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3">
      <div class="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
        <button v-for="d in ['', 'ALLOW', 'REVIEW', 'BLOCK']" :key="d || 'all'"
          @click="decision = d as any; load()"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
          :class="decision === d ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
          {{ d ? d.toLowerCase() : 'all' }}
        </button>
      </div>
      <input v-model="userId" @keyup.enter="load" placeholder="Filter by user id…"
        class="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md w-56" />
      <button @click="load" class="h-9 px-3.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Apply</button>
      <span class="ml-auto text-xs text-slate-400">{{ loading ? 'Loading…' : `${rows.length} transactions` }}</span>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
      <!-- Table -->
      <div class="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-2xs uppercase tracking-wide text-slate-400 bg-slate-50">
              <th class="text-left px-4 py-2.5 font-semibold">User</th>
              <th class="text-left px-4 py-2.5 font-semibold">Location</th>
              <th class="text-left px-4 py-2.5 font-semibold">When</th>
              <th class="text-right px-4 py-2.5 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.transaction_id" @click="openRow(t)"
              class="border-t border-slate-50 cursor-pointer hover:bg-slate-50"
              :class="selected?.transaction_id === t.transaction_id && 'bg-indigo-50/50'">
              <td class="px-4 py-2.5">
                <div class="font-medium text-slate-700">{{ t.user_id }}</div>
                <div class="text-2xs text-slate-400 font-mono">{{ t.transaction_id.slice(0, 12) }}…</div>
              </td>
              <td class="px-4 py-2.5 text-slate-600">{{ t.location || '—' }}</td>
              <td class="px-4 py-2.5 text-slate-500 text-xs">{{ new Date(t.timestamp).toLocaleString() }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-slate-800">{{ money(t.amount, t.currency) }}</td>
            </tr>
            <tr v-if="!rows.length && !loading"><td colspan="4" class="px-4 py-10 text-center text-slate-400">No transactions match.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Detail / assessment -->
      <div class="rounded-xl bg-white border border-slate-200 p-4 self-start">
        <div v-if="!selected" class="text-sm text-slate-400 py-8 text-center">Select a transaction to see Sentinel's assessment.</div>
        <div v-else class="space-y-3">
          <div>
            <div class="text-2xs uppercase tracking-wide text-slate-400">Transaction</div>
            <div class="font-semibold text-slate-800">{{ money(selected.amount, selected.currency) }}</div>
            <div class="text-xs text-slate-400">{{ selected.user_id }} · {{ selected.location || 'unknown' }}</div>
          </div>
          <div v-if="assessing" class="text-sm text-slate-400 py-4">Assessing with Sentinel AI…</div>
          <div v-else-if="verdict" class="space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-2xs uppercase tracking-wide text-slate-400 ring-1 ring-inset px-2 py-0.5 rounded font-semibold" :class="decTone[verdict.decision]">{{ verdict.decision }}</span>
              <span class="text-sm font-semibold text-slate-800">{{ Math.round(verdict.score * 100) }}% fraud score</span>
            </div>
            <div>
              <div class="text-2xs uppercase tracking-wide text-slate-400 mb-1">Signals</div>
              <div class="flex flex-wrap gap-1">
                <span v-for="s in verdict.signals" :key="s" class="text-2xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">{{ s }}</span>
                <span v-if="!verdict.signals.length" class="text-xs text-slate-400">none</span>
              </div>
            </div>
            <div class="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <div class="text-2xs uppercase tracking-wide text-indigo-600 font-semibold mb-1">AI assessment</div>
              <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{{ verdict.reason }}</p>
            </div>
          </div>
          <div v-else class="text-sm text-rose-500 py-4">Could not assess this transaction.</div>
        </div>
      </div>
    </div>
  </div>
</template>
