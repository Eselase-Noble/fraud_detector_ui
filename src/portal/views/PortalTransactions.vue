<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { listTransactions } from '@/portal/api'
import type { TxnRow } from '@/portal/types'
import SectionCard from '@/components/ui/SectionCard.vue'
import DecisionBadge from '@/components/ui/DecisionBadge.vue'

const FILTERS = ['all', 'BLOCK', 'REVIEW', 'ALLOW'] as const
const decision = ref<string>('all')
const search = ref('')
const rows = ref<TxnRow[]>([])
const loading = ref(true)
const expanded = ref<string | null>(null)

const load = async () => {
  loading.value = true
  try {
    rows.value = await listTransactions({
      decision: decision.value === 'all' ? undefined : decision.value,
      search: search.value.trim() || undefined,
      limit: 200,
    })
  } catch { rows.value = [] } finally { loading.value = false }
}
onMounted(load)
watch(decision, load)
let t: ReturnType<typeof setTimeout>
watch(search, () => { clearTimeout(t); t = setTimeout(load, 300) })

const time = (s: string) => { try { return new Date(s).toLocaleString() } catch { return s } }
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Transactions</h2>
      <p class="text-sm text-slate-500">Every transaction Sentinel has scored for your institution. Only you can see these.</p>
    </div>

    <SectionCard>
      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          <button v-for="f in FILTERS" :key="f" @click="decision = f"
            class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            :class="decision === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'">
            {{ f === 'all' ? 'All' : f }}
          </button>
        </div>
        <input v-model="search" placeholder="Search user or transaction id…"
          class="h-9 flex-1 min-w-[200px] px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        <span class="text-xs text-slate-400">{{ rows.length }} shown</span>
      </div>
    </SectionCard>

    <SectionCard>
      <template #flush />
      <div v-if="loading" class="p-6 text-sm text-slate-400">Loading transactions…</div>
      <div v-else-if="!rows.length" class="p-10 text-center text-sm text-slate-400">No transactions match.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
            <th class="text-left px-4 py-2.5 font-semibold">Transaction</th>
            <th class="text-left px-4 py-2.5 font-semibold">User</th>
            <th class="text-left px-4 py-2.5 font-semibold">Location</th>
            <th class="text-right px-4 py-2.5 font-semibold">Amount</th>
            <th class="text-right px-4 py-2.5 font-semibold">Risk</th>
            <th class="text-left px-4 py-2.5 font-semibold pl-4">Decision</th>
            <th class="text-left px-4 py-2.5 font-semibold">When</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <template v-for="r in rows" :key="r.transaction_id">
            <tr class="hover:bg-slate-50/60 cursor-pointer" @click="expanded = expanded === r.transaction_id ? null : r.transaction_id">
              <td class="px-4 py-2.5 font-mono text-xs text-slate-500 truncate max-w-[140px]">{{ r.transaction_id }}</td>
              <td class="px-4 py-2.5 text-slate-600">{{ r.user_id }}</td>
              <td class="px-4 py-2.5 text-slate-500">{{ r.location || '—' }}</td>
              <td class="px-4 py-2.5 text-right font-medium text-slate-800 tabular-nums">{{ r.currency }} {{ Number(r.amount).toLocaleString() }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums" :class="(r.score ?? 0) >= 0.75 ? 'text-rose-600 font-semibold' : (r.score ?? 0) >= 0.4 ? 'text-amber-600' : 'text-slate-400'">{{ r.score != null ? Math.round(r.score * 100) : '—' }}</td>
              <td class="px-4 py-2.5"><DecisionBadge :decision="r.decision" /></td>
              <td class="px-4 py-2.5 text-xs text-slate-500">{{ time(r.timestamp) }}</td>
            </tr>
            <tr v-if="expanded === r.transaction_id" class="bg-slate-50/60">
              <td colspan="7" class="px-4 py-3">
                <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">AI analyst reason</div>
                <p class="text-sm text-slate-700 leading-relaxed">{{ r.reason || 'No explanation recorded.' }}</p>
                <div v-if="r.signals?.length" class="mt-2 flex flex-wrap gap-1.5">
                  <span v-for="s in r.signals" :key="s" class="px-2 py-0.5 text-[11px] rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">{{ s }}</span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </SectionCard>
  </div>
</template>
