<script setup lang="ts">
import { ref } from 'vue'
import { staffLogin } from '@/api/platform'
import { staffUser, type StaffUser } from '@/platform/auth'

const emit = defineEmits<{ authed: [StaffUser] }>()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const submit = async () => {
  if (!email.value.trim() || !password.value) return
  loading.value = true; error.value = ''
  try {
    const user = await staffLogin(email.value.trim(), password.value)
    staffUser.value = user
    emit('authed', user)
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    error.value = status === 403 ? 'This staff account is disabled.'
      : status === 401 ? 'Incorrect email or password.' : 'Could not sign in.'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="min-h-screen grid place-items-center bg-slate-900 p-6">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-2.5 mb-8">
        <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 text-white font-bold">S</span>
        <div class="leading-tight">
          <div class="font-semibold text-white tracking-tight">Sentinel</div>
          <div class="text-[10px] uppercase tracking-[0.16em] text-slate-400">Operator Console</div>
        </div>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold text-slate-900">Staff sign in</h2>
        <p class="mt-1 text-sm text-slate-500">Operator access only. Partners use the client portal at <a href="/" class="text-indigo-600 hover:underline">/</a>.</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Work email</span>
            <input v-model="email" type="email" autocomplete="username" placeholder="you@sentinel.local"
              class="mt-1 h-10 w-full px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Password</span>
            <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••••"
              class="mt-1 h-10 w-full px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </label>
          <div v-if="error" class="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2 ring-1 ring-inset ring-rose-600/20">{{ error }}</div>
          <button type="submit" :disabled="loading || !email.trim() || !password"
            class="h-10 w-full text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
      <p class="mt-4 text-center text-xs text-slate-500">© AfricodeLab · Sentinel Fraud Intelligence</p>
    </div>
  </div>
</template>
