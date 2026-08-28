<script setup lang="ts">
import { ref } from 'vue'
import { getUserHistory, getRiskProfile } from '@/api/users'
import type { Transaction } from '@/types/fraud'

defineOptions({ name: 'UsersView' })

const userId = ref('')
const loading = ref(false)
const error = ref('')
const profile = ref<Record<string, unknown> | null>(null)
const history = ref<Transaction[]>([])

const money = (n = 0, c = 'GHS') => `${c} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

const lookup = async () => {
  const id = userId.value.trim()
  if (!id) return
  loading.value = true
  error.value = ''
  profile.value = null
  history.value = []
  try {
    const [p, h] = await Promise.all([
      getRiskProfile(id).catch(() => null),
      getUserHistory(id, 30).catch(() => []),
    ])
    profile.value = p
    history.value = h
    if (!p && !h.length) error.value = 'No data found for this user.'
  } catch {
    error.value = 'Lookup failed.'
  } finally {
    loading.value = false
  }
}

const entries = () =>
  Object.entries(profile.value || {}).filter(([, v]) => typeof v !== 'object')
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Users & Risk</h2>
      <p class="text-sm text-slate-500">Look up a user's risk profile and recent transaction history.</p>
    </div>

    <div class="flex gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3">
      <input v-model="userId" @keyup.enter="lookup" placeholder="Enter user id (e.g. user_123)…"
        class="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md flex-1 max-w-md" />
      <button @click="lookup" class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Look up</button>
    </div>

    <div v-if="loading" class="text-sm text-slate-400 py-6">Loading…</div>
    <div v-else-if="error" class="text-sm text-slate-500 py-6">{{ error }}</div>

    <div v-else-if="profile || history.length" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Profile -->
      <div class="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">Risk profile</div>
        <div class="p-4 space-y-2.5 text-sm">
          <div v-for="[k, v] in entries()" :key="k" class="flex items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-wide text-slate-400">{{ k.replace(/_/g, ' ') }}</span>
            <span class="text-slate-700 font-medium">{{ v }}</span>
          </div>
          <div v-if="!entries().length" class="text-slate-400">No profile fields.</div>
        </div>
      </div>

      <!-- History -->
      <div class="rounded-xl bg-white border border-slate-200 overflow-hidden lg:col-span-2">
        <div class="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">Recent transactions ({{ history.length }})</div>
        <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[520px]">
          <thead>
            <tr class="text-2xs uppercase tracking-wide text-slate-400 bg-slate-50">
              <th class="text-left px-4 py-2 font-semibold">When</th>
              <th class="text-left px-4 py-2 font-semibold">Location</th>
              <th class="text-right px-4 py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in history" :key="t.transaction_id" class="border-t border-slate-50">
              <td class="px-4 py-2 text-slate-500 text-xs">{{ new Date(t.timestamp).toLocaleString() }}</td>
              <td class="px-4 py-2 text-slate-600">{{ t.location || '—' }}</td>
              <td class="px-4 py-2 text-right font-medium text-slate-800">{{ money(t.amount, t.currency) }}</td>
            </tr>
            <tr v-if="!history.length"><td colspan="3" class="px-4 py-6 text-center text-slate-400">No history.</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>
</template>
