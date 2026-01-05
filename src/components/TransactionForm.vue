<script setup lang="ts">
import { ref } from "vue"
import { detectFraud } from "@/api/transactions"
import type { Transaction, FraudResult as Result } from "@/types/fraud"
import FraudResult from "@/components/FraudResult.vue"

const txn = ref<Transaction>({
  transaction_id: "",
  user_id: "",
  amount: 0,
  currency: "USD",
  merchant: "",
  location: "",
  timestamp: new Date().toISOString(),
})

const result = ref<Result | null>(null)
const loading = ref(false)

const submit = async () => {
  loading.value = true
  result.value = null

  try {
    result.value = await detectFraud(txn.value)
    console.log("Result: ",  result.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="min-h-screen bg-neutral-950 text-white px-6 py-24">
    <div class="max-w-4xl mx-auto">

      <!-- HEADER -->
      <header class="mb-14 text-center">
        <h1
          class="text-4xl md:text-5xl font-extrabold tracking-tight
                 bg-gradient-to-br from-white via-gray-200 to-gray-400
                 bg-clip-text text-transparent"
        >
          Live Fraud Detection
        </h1>

        <p class="mt-4 text-gray-400 max-w-2xl mx-auto">
          Submit a transaction to evaluate fraud risk using
          real-time rules, historical analysis, and AI reasoning.
        </p>
      </header>

      <!-- FORM CARD -->
      <div
        class="relative rounded-2xl border border-white/10 bg-white/5
               backdrop-blur p-8 md:p-10
               shadow-[0_0_80px_-40px_rgba(99,102,241,0.4)]"
      >
        <div class="grid gap-6 md:grid-cols-2">
          <div class="field">
            <label>Transaction ID</label>
            <input v-model="txn.transaction_id" placeholder="txn_123456" />
          </div>

          <div class="field">
            <label>User ID</label>
            <input v-model="txn.user_id" placeholder="user_42" />
          </div>

          <div class="field">
            <label>Amount</label>
            <input
              v-model.number="txn.amount"
              type="number"
              min="0"
              placeholder="250.00"
            />
          </div>

          <div class="field">
            <label>Currency</label>
            <select v-model="txn.currency">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>

          <div class="field">
            <label>Merchant</label>
            <input v-model="txn.merchant" placeholder="Amazon" />
          </div>

          <div class="field">
            <label>Location</label>
            <input v-model="txn.location" placeholder="New York, US" />
          </div>
        </div>

        <!-- ACTION -->
        <div class="mt-10 flex justify-end">
          <button
            @click="submit"
            :disabled="loading"
            class="relative inline-flex items-center justify-center
                   rounded-xl bg-indigo-600 px-10 py-4 font-semibold
                   transition-all duration-300
                   hover:bg-indigo-500
                   disabled:opacity-60 disabled:cursor-not-allowed
                   hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.8)]"
          >
            <span v-if="!loading">Analyze Transaction</span>
            <span v-else class="flex items-center gap-2">
              <svg
                class="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Analyzing…
            </span>
          </button>
        </div>
      </div>

      <!-- RESULT -->
      <div
        v-if="result"
        class="mt-14 animate-fade-in"
      >
        <FraudResult :result="result" />
      </div>

    </div>
  </section>
</template>

<style scoped>
.field {
  @apply flex flex-col gap-2;
}

.field label {
  @apply text-sm font-medium text-gray-300;
}

.field input,
.field select {
  @apply rounded-xl border border-white/10 bg-black/40 px-4 py-3
  text-white placeholder-gray-500
  outline-none transition
  focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out both;
}
</style>
