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
    <div class="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 text-white p-10">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div class="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />

      <div class="relative flex items-center gap-2.5">
        <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 font-bold">S</span>
        <div class="leading-tight">
          <div class="font-semibold tracking-tight">Sentinel</div>
          <div class="text-[10px] uppercase tracking-[0.16em] text-slate-400">Partner Portal</div>
        </div>
      </div>

      <div class="relative">
        <!-- Fraud-detection radar: transactions stream in, a sweep scans them,
             most clear (blue/green) while a threat pulses red. -->
        <div class="radar mx-auto mb-8" aria-hidden="true">
          <span class="ring ring-1" />
          <span class="ring ring-2" />
          <span class="ring ring-3" />
          <span class="cross cross-h" />
          <span class="cross cross-v" />
          <span class="sweep" />
          <span class="core" />
          <span class="blip ok"     style="top:32%; left:64%; animation-delay:0s" />
          <span class="blip ok2"    style="top:58%; left:38%; animation-delay:.8s" />
          <span class="blip ok"     style="top:70%; left:66%; animation-delay:1.6s" />
          <span class="blip review" style="top:26%; left:40%; animation-delay:1.1s" />
          <span class="blip threat" style="top:47%; left:56%; animation-delay:.4s" />
        </div>

        <h1 class="text-3xl font-semibold leading-tight max-w-md">Real-time fraud intelligence for your institution.</h1>
        <p class="mt-4 text-slate-300 leading-relaxed max-w-md">Connect transaction data, configure decision webhooks, and manage credentials — from one secure portal.</p>
        <div class="mt-6 flex items-center gap-4 text-xs text-slate-400">
          <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400" /> Allowed</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400" /> Review</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500" /> Blocked</span>
        </div>
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

<style scoped>
/* ── Fraud-detection radar ─────────────────────────────────────────────── */
.radar {
  position: relative;
  width: 230px;
  height: 230px;
}
.ring {
  position: absolute;
  inset: 0;
  margin: auto;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.16);
}
.ring-1 { width: 230px; height: 230px; }
.ring-2 { width: 156px; height: 156px; }
.ring-3 { width: 84px;  height: 84px;  }
.cross { position: absolute; background: rgba(148, 163, 184, 0.12); }
.cross-h { top: 50%; left: 0; right: 0; height: 1px; }
.cross-v { left: 50%; top: 0; bottom: 0; width: 1px; }

.sweep {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    rgba(56, 189, 248, 0) 0deg,
    rgba(56, 189, 248, 0.35) 45deg,
    rgba(56, 189, 248, 0) 90deg);
  animation: radar-spin 4s linear infinite;
}
.core {
  position: absolute;
  top: 50%; left: 50%;
  width: 8px; height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: #818cf8;
  box-shadow: 0 0 12px 2px rgba(129, 140, 248, 0.7);
}

.blip {
  position: absolute;
  width: 9px; height: 9px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: blip-ping 3s ease-out infinite;
}
.blip.ok     { color: #34d399; background: #34d399; }
.blip.ok2    { color: #38bdf8; background: #38bdf8; }
.blip.review { color: #fbbf24; background: #fbbf24; }
.blip.threat {
  color: #f43f5e; background: #f43f5e;
  width: 11px; height: 11px;
  animation: blip-threat 1.8s ease-out infinite;
}

@keyframes radar-spin { to { transform: rotate(360deg); } }
@keyframes blip-ping {
  0%        { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70%       { box-shadow: 0 0 0 12px transparent; opacity: 0.55; }
  100%      { box-shadow: 0 0 0 0 transparent; opacity: 0.55; }
}
@keyframes blip-threat {
  0%        { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.8); opacity: 1; transform: translate(-50%, -50%) scale(1); }
  60%       { box-shadow: 0 0 0 16px rgba(244, 63, 94, 0); opacity: 1; transform: translate(-50%, -50%) scale(1.25); }
  100%      { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .sweep, .blip { animation: none; }
}
</style>
