<script setup lang="ts">
import { ref } from 'vue'
import { login } from '@/portal/api'
import type { PortalProfile } from '@/portal/types'

const emit = defineEmits<{ authed: [PortalProfile] }>()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const submit = async () => {
  if (!email.value.trim() || !password.value) return
  loading.value = true; error.value = ''
  try {
    const profile = await login(email.value.trim(), password.value)
    emit('authed', profile)
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    error.value = status === 403
      ? 'This account is suspended. Contact Sentinel support.'
      : status === 401 ? 'Incorrect email or password.' : 'Could not sign in. Try again.'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Brand panel -->
    <div class="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-900 text-white p-10">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/30 blur-3xl" />
      <div class="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div class="relative flex items-center gap-2.5">
        <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 font-bold">S</span>
        <div class="leading-tight">
          <div class="font-semibold tracking-tight">Sentinel</div>
          <div class="text-[10px] uppercase tracking-[0.16em] text-slate-400">Partner Portal</div>
        </div>
      </div>
      <div class="relative max-w-md">
        <h1 class="text-3xl font-semibold leading-tight">Real-time fraud intelligence for your institution.</h1>
        <p class="mt-4 text-slate-300 leading-relaxed">Manage how you connect transaction data, configure decision webhooks, and rotate credentials — all from one secure portal.</p>
        <ul class="mt-6 space-y-2.5 text-sm text-slate-300">
          <li class="flex items-center gap-2.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Real-time API, batch, database or file connections</li>
          <li class="flex items-center gap-2.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Decision webhooks on BLOCK / REVIEW / ALLOW</li>
          <li class="flex items-center gap-2.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Self-service keys, usage and connection tests</li>
        </ul>
      </div>
      <div class="relative text-[11px] text-slate-500">© AfricodeLab · Sentinel Fraud Intelligence</div>
    </div>

    <!-- Form panel -->
    <div class="flex items-center justify-center p-6 sm:p-10 bg-slate-50">
      <div class="w-full max-w-sm">
        <div class="lg:hidden flex items-center gap-2.5 mb-8">
          <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 text-white font-bold">S</span>
          <div class="font-semibold text-slate-900">Sentinel Partner Portal</div>
        </div>

        <h2 class="text-xl font-semibold text-slate-900">Sign in</h2>
        <p class="mt-1 text-sm text-slate-500">Use the credentials issued to your institution.</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Work email</span>
            <input v-model="email" type="email" autocomplete="username" placeholder="you@institution.example"
              class="mt-1 h-10 w-full px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-slate-600">Password</span>
            <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••••"
              class="mt-1 h-10 w-full px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </label>

          <div v-if="error" class="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2 ring-1 ring-inset ring-rose-600/20">{{ error }}</div>

          <button type="submit" :disabled="loading || !email.trim() || !password"
            class="h-10 w-full text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="mt-6 text-xs text-slate-400">
          Don’t have access? Your Sentinel operator provisions a portal login when they register your institution.
          Lost your password? Ask them to reset it.
        </p>
      </div>
    </div>
  </div>
</template>
