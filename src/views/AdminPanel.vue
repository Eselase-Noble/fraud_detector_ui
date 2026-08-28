<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAuditLog, updateUserRisk, type AuditEntry, type RiskTier } from '@/api/admin'
import SectionCard from '@/components/ui/SectionCard.vue'
import DecisionBadge from '@/components/ui/DecisionBadge.vue'

defineOptions({ name: 'AdminPanelView' })

const toast = ref<{ tone: 'ok' | 'err'; msg: string } | null>(null)
const flash = (tone: 'ok' | 'err', msg: string) => { toast.value = { tone, msg }; setTimeout(() => (toast.value = null), 3500) }

/* ── Audit log ── */
const entries = ref<AuditEntry[]>([])
const loadingLog = ref(true)
const filters = ref({ transaction_id: '', analyst_id: '' })
const loadLog = async () => {
  loadingLog.value = true
  try {
    entries.value = await getAuditLog({
      transaction_id: filters.value.transaction_id,
      analyst_id: filters.value.analyst_id,
      limit: 100, offset: 0,
    })
  } catch { flash('err', 'Could not load the audit log.') } finally { loadingLog.value = false }
}
onMounted(loadLog)
const clearFilters = () => { filters.value = { transaction_id: '', analyst_id: '' }; loadLog() }

/* ── User risk override ── */
const TIERS: RiskTier[] = ['standard', 'elevated', 'high']
const risk = ref<{ user_id: string; risk_tier: RiskTier; is_flagged: boolean; notes: string }>({
  user_id: '', risk_tier: 'standard', is_flagged: false, notes: '',
})
const savingRisk = ref(false)
const saveRisk = async () => {
  if (!risk.value.user_id.trim()) { flash('err', 'Enter a user id.'); return }
  savingRisk.value = true
  try {
    await updateUserRisk(risk.value.user_id.trim(), {
      risk_tier: risk.value.risk_tier,
      is_flagged: risk.value.is_flagged,
      notes: risk.value.notes.trim() || null,
    })
    flash('ok', `Risk profile updated for ${risk.value.user_id.trim()}.`)
    risk.value = { user_id: '', risk_tier: 'standard', is_flagged: false, notes: '' }
  } catch { flash('err', 'Update failed.') } finally { savingRisk.value = false }
}

const tierTone: Record<string, string> = {
  standard: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  elevated: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  high: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}
const when = (s: string) => { try { return new Date(s).toLocaleString() } catch { return s } }
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Admin &amp; audit</h2>
      <p class="text-sm text-slate-500">Every analyst action is recorded here. Override a user's risk tier when a case warrants it.</p>
    </div>

    <transition name="fade">
      <div v-if="toast" class="rounded-md px-4 py-2.5 text-sm ring-1 ring-inset"
        :class="toast.tone === 'ok' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'">
        {{ toast.msg }}
      </div>
    </transition>

    <!-- User risk override -->
    <SectionCard title="Override user risk" subtitle="Set a manual tier and flag. Applied on the user's next assessment.">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="block">
          <span class="text-xs font-medium text-slate-500">User ID</span>
          <input v-model="risk.user_id" placeholder="user_123"
            class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-slate-500">Risk tier</span>
          <select v-model="risk.risk_tier"
            class="mt-1 h-9 w-full px-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
            <option v-for="t in TIERS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label class="flex items-end gap-2 pb-1.5">
          <input type="checkbox" v-model="risk.is_flagged" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <span class="text-sm text-slate-600">Flag account</span>
        </label>
        <div class="flex items-end">
          <button @click="saveRisk" :disabled="savingRisk"
            class="h-9 w-full text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {{ savingRisk ? 'Saving…' : 'Apply override' }}
          </button>
        </div>
        <label class="block sm:col-span-2 lg:col-span-4">
          <span class="text-xs font-medium text-slate-500">Notes</span>
          <input v-model="risk.notes" placeholder="Reason for the override (optional)"
            class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </label>
      </div>
    </SectionCard>

    <!-- Audit log -->
    <SectionCard title="Audit log" subtitle="Case reviews and decision overrides">
      <template #actions>
        <button @click="loadLog" class="text-xs font-medium text-indigo-600 hover:underline">Refresh</button>
      </template>
      <div class="flex flex-wrap gap-2 mb-4">
        <input v-model="filters.transaction_id" @keyup.enter="loadLog" placeholder="Filter by transaction id"
          class="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md w-56 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        <input v-model="filters.analyst_id" @keyup.enter="loadLog" placeholder="Filter by analyst id"
          class="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md w-56 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        <button @click="loadLog" class="h-9 px-4 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800">Apply</button>
        <button @click="clearFilters" class="h-9 px-4 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Clear</button>
      </div>

      <div v-if="loadingLog" class="py-8 text-center text-sm text-slate-400">Loading audit trail…</div>
      <div v-else-if="!entries.length" class="py-10 text-center text-sm text-slate-400">No audit entries match.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
            <th class="text-left px-3 py-2.5 font-semibold">When</th>
            <th class="text-left px-3 py-2.5 font-semibold">Analyst</th>
            <th class="text-left px-3 py-2.5 font-semibold">Action</th>
            <th class="text-left px-3 py-2.5 font-semibold">Transaction</th>
            <th class="text-left px-3 py-2.5 font-semibold">Change</th>
            <th class="text-left px-3 py-2.5 font-semibold">Note</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="e in entries" :key="e.id" class="hover:bg-slate-50/60">
            <td class="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{{ when(e.created_at) }}</td>
            <td class="px-3 py-2.5 font-mono text-xs text-slate-600">{{ e.analyst_id || '—' }}</td>
            <td class="px-3 py-2.5">
              <span class="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-50 text-indigo-700">{{ e.action }}</span>
            </td>
            <td class="px-3 py-2.5 font-mono text-xs text-slate-500 truncate max-w-[140px]">{{ e.transaction_id }}</td>
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-1.5" v-if="e.previous_decision || e.new_decision">
                <DecisionBadge :decision="e.previous_decision" />
                <span class="text-slate-300">→</span>
                <DecisionBadge :decision="e.new_decision" />
              </div>
              <span v-else class="text-slate-300 text-xs">—</span>
            </td>
            <td class="px-3 py-2.5 text-xs text-slate-500 truncate max-w-[200px]">{{ e.note || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </SectionCard>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
