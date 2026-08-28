<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listTransactions } from '@/portal/api'
import type { PortalProfile, TxnRow } from '@/portal/types'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatCard from '@/components/ui/StatCard.vue'
import DecisionBadge from '@/components/ui/DecisionBadge.vue'

const props = defineProps<{ profile: PortalProfile }>()

const recent = ref<TxnRow[]>([])
const loading = ref(true)
onMounted(async () => {
  try { recent.value = await listTransactions({ limit: 6 }) } catch { /* empty */ } finally { loading.value = false }
})

const u = computed(() => props.profile.usage)
const blockRate = computed(() => (u.value.scored ? Math.round((u.value.blocked / u.value.scored) * 100) : 0))
const seg = computed(() => {
  const t = Math.max(1, u.value.scored)
  return {
    allowed: (u.value.allowed / t) * 100,
    reviewed: (u.value.reviewed / t) * 100,
    blocked: (u.value.blocked / t) * 100,
  }
})
const money = (n = 0) => `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const time = (s: string) => { try { return new Date(s).toLocaleString() } catch { return s } }
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Welcome back{{ profile.user?.name ? `, ${profile.user.name}` : '' }}</h2>
      <p class="text-sm text-slate-500">Real-time view of the transactions Sentinel has scored for {{ profile.integration.partner_name }}.</p>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Transactions scored" :value="u.scored.toLocaleString()" tone="indigo" />
      <StatCard label="Blocked" :value="u.blocked" tone="rose" :hint="`${blockRate}% block rate`" />
      <StatCard label="Under review" :value="u.reviewed" tone="amber" />
      <StatCard label="Flagged amount" :value="money(u.flagged_amount)" tone="default" />
    </div>

    <!-- Decision breakdown -->
    <SectionCard title="Decision mix" subtitle="Share of scored transactions by outcome">
      <div class="flex h-3 rounded-full overflow-hidden bg-slate-100">
        <div class="bg-emerald-400" :style="{ width: seg.allowed + '%' }" />
        <div class="bg-amber-400" :style="{ width: seg.reviewed + '%' }" />
        <div class="bg-rose-500" :style="{ width: seg.blocked + '%' }" />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Allowed · {{ u.allowed }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Review · {{ u.reviewed }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Blocked · {{ u.blocked }}</span>
      </div>
    </SectionCard>

    <!-- Recent detections -->
    <SectionCard title="Recent detections">
      <template #flush />
      <div v-if="loading" class="p-6 text-sm text-slate-400">Loading…</div>
      <div v-else-if="!recent.length" class="p-10 text-center text-sm text-slate-400">No transactions scored yet. Run one from the Detect tab, or connect your systems.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
            <th class="text-left px-4 py-2.5 font-semibold">Transaction</th>
            <th class="text-left px-4 py-2.5 font-semibold">User</th>
            <th class="text-right px-4 py-2.5 font-semibold">Amount</th>
            <th class="text-left px-4 py-2.5 font-semibold pl-4">Decision</th>
            <th class="text-left px-4 py-2.5 font-semibold">When</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="t in recent" :key="t.transaction_id" class="hover:bg-slate-50/60">
            <td class="px-4 py-2.5 font-mono text-xs text-slate-500 truncate max-w-[140px]">{{ t.transaction_id }}</td>
            <td class="px-4 py-2.5 text-slate-600">{{ t.user_id }}</td>
            <td class="px-4 py-2.5 text-right font-medium text-slate-800 tabular-nums">{{ t.currency }} {{ Number(t.amount).toLocaleString() }}</td>
            <td class="px-4 py-2.5"><DecisionBadge :decision="t.decision" /></td>
            <td class="px-4 py-2.5 text-xs text-slate-500">{{ time(t.timestamp) }}</td>
          </tr>
        </tbody>
      </table>
    </SectionCard>
  </div>
</template>
