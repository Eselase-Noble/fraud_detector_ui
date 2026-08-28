<script setup lang="ts">
import { toasts, dismissToast, type ToastType } from '@/lib/toast'

const tone: Record<ToastType, string> = {
  success: 'bg-white border-emerald-200 text-slate-700',
  error: 'bg-white border-rose-200 text-slate-700',
  info: 'bg-white border-slate-200 text-slate-700',
}
const dot: Record<ToastType, string> = {
  success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-indigo-500',
}
</script>

<template>
  <div class="fixed z-[60] top-4 right-4 left-4 sm:left-auto sm:w-80 flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id"
        class="pointer-events-auto flex items-start gap-2.5 rounded-lg border shadow-lg px-3.5 py-2.5 text-sm"
        :class="tone[t.type]" @click="dismissToast(t.id)" role="status">
        <span class="mt-1 w-2 h-2 rounded-full shrink-0" :class="dot[t.type]" />
        <span class="flex-1 leading-snug">{{ t.message }}</span>
        <button class="text-slate-300 hover:text-slate-500 leading-none text-base" @click.stop="dismissToast(t.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from { opacity: 0; transform: translateX(16px); }
.toast-leave-to { opacity: 0; transform: translateX(16px); }
.toast-move { transition: transform .25s ease; }
</style>
