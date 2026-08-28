<script setup lang="ts">
import { confirmState, settleConfirm } from '@/lib/confirm'
</script>

<template>
  <Transition name="confirm-fade">
    <div v-if="confirmState.open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="settleConfirm(false)" />
      <div class="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
        <div class="flex items-start gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            :class="confirmState.tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-slate-900">{{ confirmState.title }}</h3>
            <p v-if="confirmState.message" class="mt-1 text-sm text-slate-500 leading-relaxed">{{ confirmState.message }}</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button @click="settleConfirm(false)" class="h-9 px-4 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">{{ confirmState.cancelLabel }}</button>
          <button @click="settleConfirm(true)" autofocus
            class="h-9 px-4 text-sm font-medium rounded-md text-white shadow-sm"
            :class="confirmState.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'">
            {{ confirmState.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-fade-enter-active, .confirm-fade-leave-active { transition: opacity .15s ease; }
.confirm-fade-enter-from, .confirm-fade-leave-to { opacity: 0; }
</style>
