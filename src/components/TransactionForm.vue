<!--TransactionForm.vue-->
<script setup lang="ts">
import { ref } from 'vue'
import { detectFraud } from '@/api/transactions'
import type { Transaction, FraudResult as Result } from '@/types/fraud'
import FraudResult from '@/components/FraudResult.vue'

const txn = ref<Transaction>({
  transaction_id: '',
  user_id: '',
  amount: 0,
  currency: 'USD',
  location: '',
  merchant_id: '',
  merchant_category: '',
  device_id: '',
  ip_address: '',
  timestamp: new Date().toISOString(),
})

const result = ref<Result | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const MERCHANT_CATEGORIES = [
  { value: '', label: 'Select category…' },
  { value: 'retail', label: 'Retail' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'travel', label: 'Travel' },
  { value: 'crypto', label: 'Crypto ⚠' },
  { value: 'gambling', label: 'Gambling ⚠' },
  { value: 'wire_transfer', label: 'Wire Transfer ⚠' },
  { value: 'gift_cards', label: 'Gift Cards ⚠' },
  { value: 'forex', label: 'Forex ⚠' },
  { value: 'food_delivery', label: 'Food & Delivery' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
]

const submit = async () => {
  if (!txn.value.user_id || !txn.value.amount) {
    error.value = 'User ID and Amount are required.'
    return
  }

  loading.value = true
  result.value = null
  error.value = null

  // Auto-generate transaction_id if blank
  if (!txn.value.transaction_id) {
    txn.value.transaction_id = `txn_${Date.now()}`
  }

  txn.value.timestamp = new Date().toISOString()

  try {
    result.value = await detectFraud(txn.value)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred.'
  } finally {
    loading.value = false
  }
}

const reset = () => {
  result.value = null
  error.value = null
  txn.value = {
    transaction_id: '',
    user_id: '',
    amount: 0,
    currency: 'USD',
    location: '',
    merchant_id: '',
    merchant_category: '',
    device_id: '',
    ip_address: '',
    timestamp: new Date().toISOString(),
  }
}
</script>

<template>
  <section class="min-h-screen bg-neutral-950 text-white px-6 py-24">
    <div class="max-w-4xl mx-auto">

      <!-- HEADER -->
      <header class="mb-14 text-center">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-white/10
                 bg-white/5 px-4 py-1.5 text-xs text-gray-300 backdrop-blur"
        >
          Real-Time · AI-Powered · Explainable
        </span>
        <h1
          class="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight
                 bg-gradient-to-br from-white via-gray-200 to-gray-400
                 bg-clip-text text-transparent"
        >
          Live Fraud Detection
        </h1>
        <p class="mt-4 text-gray-400 max-w-2xl mx-auto">
          Submit a transaction to evaluate fraud risk using real-time rules,
          velocity analysis, and AI reasoning.
        </p>
      </header>

      <!-- FORM CARD -->
      <div
        class="relative rounded-2xl border border-white/10 bg-white/5
               backdrop-blur p-8 md:p-10
               shadow-[0_0_80px_-40px_rgba(99,102,241,0.4)]"
      >
        <!-- Section: Core Details -->
        <p class="text-xs uppercase tracking-widest text-gray-500 mb-5 font-semibold">
          Transaction Details
        </p>
        <div class="grid gap-5 md:grid-cols-2">
          <div class="field">
            <label>Transaction ID <span class="text-gray-500">(auto-generated if blank)</span></label>
            <input v-model="txn.transaction_id" placeholder="txn_123456" />
          </div>
          <div class="field">
            <label>User ID <span class="text-red-400">*</span></label>
            <input v-model="txn.user_id" placeholder="user_42" required />
          </div>
          <div class="field">
            <label>Amount (USD) <span class="text-red-400">*</span></label>
            <input v-model.number="txn.amount" type="number" min="0" step="0.01" placeholder="250.00" />
          </div>
          <div class="field">
            <label>Currency</label>
            <select v-model="txn.currency">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>GHS</option>
              <option>NGN</option>
              <option>ZAR</option>
            </select>
          </div>
          <div class="field">
            <label>Location</label>
            <input v-model="txn.location" placeholder="New York, US" />
          </div>
          <div class="field">
            <label>Merchant ID</label>
            <input v-model="txn.merchant_id" placeholder="merch_amazon" />
          </div>
        </div>

        <!-- Section: Risk Context -->
        <p class="text-xs uppercase tracking-widest text-gray-500 mt-8 mb-5 font-semibold">
          Risk Context <span class="normal-case text-gray-600 ml-1">(optional — improves scoring)</span>
        </p>
        <div class="grid gap-5 md:grid-cols-3">
          <div class="field">
            <label>Merchant Category</label>
            <select v-model="txn.merchant_category">
              <option
                v-for="cat in MERCHANT_CATEGORIES"
                :key="cat.value"
                :value="cat.value"
              >{{ cat.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>Device ID</label>
            <input v-model="txn.device_id" placeholder="dev_iphone15_a3f2" />
          </div>
          <div class="field">
            <label>IP Address</label>
            <input v-model="txn.ip_address" placeholder="192.168.1.1" />
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="mt-6 rounded-xl border border-red-400/30 bg-red-400/10
                 px-4 py-3 text-sm text-red-300"
        >
          ⚠ {{ error }}
        </div>

        <!-- Actions -->
        <div class="mt-10 flex items-center justify-between gap-4">
          <button
            @click="reset"
            class="rounded-xl border border-white/10 bg-white/5 px-6 py-3
                   text-sm text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            Reset
          </button>

          <button
            @click="submit"
            :disabled="loading"
            class="relative inline-flex items-center justify-center
                   rounded-xl bg-indigo-600 px-10 py-4 font-semibold
                   transition-all duration-300 hover:bg-indigo-500
                   disabled:opacity-60 disabled:cursor-not-allowed
                   hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.8)]"
          >
            <span v-if="!loading">Analyze Transaction</span>
            <span v-else class="flex items-center gap-2">
              <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Analyzing…
            </span>
          </button>
        </div>
      </div>

      <!-- RESULT -->
      <div v-if="result" class="mt-14 animate-fade-in">
        <FraudResult :result="result" />
      </div>

    </div>
  </section>
</template>

<style scoped>
.field { @apply flex flex-col gap-2; }

.field label { @apply text-sm font-medium text-gray-300; }

.field input,
.field select {
  @apply rounded-xl border border-white/10 bg-black/40 px-4 py-3
  text-white placeholder-gray-500 outline-none transition
  focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.4s ease-out both; }
</style>
