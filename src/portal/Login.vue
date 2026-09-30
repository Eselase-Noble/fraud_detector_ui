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
  <div class="screen">
    <div class="card">
      <!-- Radar emblem: the sweep keeps spinning; blips clear (blue/green) while a threat pulses red. -->
      <div class="radar" aria-hidden="true">
        <span class="ring ring-1" />
        <span class="ring ring-2" />
        <span class="ring ring-3" />
        <span class="cross cross-h" />
        <span class="cross cross-v" />
        <span class="sweep" />
        <span class="core" />
        <span class="blip ok"     style="top:34%; left:62%; animation-delay:0s" />
        <span class="blip ok2"    style="top:60%; left:40%; animation-delay:.8s" />
        <span class="blip review" style="top:28%; left:42%; animation-delay:1.1s" />
        <span class="blip threat" style="top:48%; left:57%; animation-delay:.4s" />
      </div>

      <div class="brand">
        <span class="mark">S</span>
        <span class="word">SENTINEL</span>
        <span class="sub">Partner Portal</span>
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span>Work email</span>
          <input v-model="email" type="email" autocomplete="username" placeholder="you@institution.example" />
        </label>
        <label class="field">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" />
        </label>

        <div v-if="error" class="error">{{ error }}</div>

        <button type="submit" :disabled="loading || !email.trim() || !password">
          <span v-if="loading" class="spinner" aria-hidden="true" />
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="hint">Access is provisioned by your Sentinel operator. Lost your password? Ask them to reset it.</p>
    </div>

    <div class="foot">© AfricodeLab · Sentinel Fraud Intelligence</div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Archivo:wght@600;700&display=swap');

.screen {
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px; padding: 32px 20px;
  background:
    radial-gradient(1100px 600px at 50% -10%, rgba(56,189,248,.06), transparent 60%),
    #05060a;
  font-family: 'Archivo', system-ui, sans-serif;
}
/* faint scan grid — a deliberate texture, not a stock gradient blob */
.screen::before {
  content: ''; position: fixed; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(148,163,184,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,.035) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 50% 40%, #000 30%, transparent 78%);
}

.card {
  position: relative; z-index: 1;
  width: 100%; max-width: 360px;
  display: flex; flex-direction: column; align-items: center;
  padding: 30px 30px 26px;
  border-radius: 16px;
  background: rgba(15,18,26,.72);
  border: 1px solid rgba(255,255,255,.07);
  box-shadow: 0 24px 70px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.04);
  backdrop-filter: blur(14px);
}

/* ── Brand ──────────────────────────────────────────────────────────────── */
.brand { display: flex; align-items: center; gap: 8px; margin: 18px 0 22px; }
.mark {
  width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #818cf8, #38bdf8);
  color: #05060a; font-weight: 800; font-size: 13px; font-family: 'DM Mono', monospace;
}
.word { font-size: 13px; font-weight: 700; letter-spacing: .22em; color: #e6ebf3; }
.sub {
  margin-left: 4px; padding-left: 10px; border-left: 1px solid rgba(255,255,255,.12);
  font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #6b7688;
}

/* ── Form ───────────────────────────────────────────────────────────────── */
.form { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field span { font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #8a93a6; }
.field input {
  height: 42px; padding: 0 13px; font-size: 14px;
  color: #e6ebf3; background: rgba(3,4,7,.6);
  border: 1px solid rgba(255,255,255,.1); border-radius: 9px;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
.field input::placeholder { color: #4d5666; }
.field input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.22); }

.error {
  font-size: 12.5px; color: #fda4af;
  background: rgba(244,63,94,.1); border: 1px solid rgba(244,63,94,.25);
  border-radius: 9px; padding: 9px 11px;
}

button[type='submit'] {
  height: 44px; margin-top: 4px;
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  font-size: 13.5px; font-weight: 700; letter-spacing: .02em;
  color: #fff; background: #6366f1; border: none; border-radius: 9px;
  cursor: pointer; transition: background .15s, opacity .15s;
}
button[type='submit']:hover:not(:disabled) { background: #4f52e0; }
button[type='submit']:disabled { opacity: .55; cursor: not-allowed; }

.spinner {
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  animation: spin .7s linear infinite;
}

.hint { margin-top: 18px; font-size: 11.5px; line-height: 1.5; color: #5a6274; text-align: center; }
.foot { position: relative; z-index: 1; font-size: 11px; color: #3f4655; letter-spacing: .02em; }

/* ── Radar (the spinning) ───────────────────────────────────────────────── */
.radar { position: relative; width: 150px; height: 150px; }
.ring { position: absolute; inset: 0; margin: auto; border-radius: 50%; border: 1px solid rgba(148,163,184,.16); }
.ring-1 { width: 150px; height: 150px; }
.ring-2 { width: 102px; height: 102px; }
.ring-3 { width: 54px;  height: 54px;  }
.cross { position: absolute; background: rgba(148,163,184,.1); }
.cross-h { top: 50%; left: 0; right: 0; height: 1px; }
.cross-v { left: 50%; top: 0; bottom: 0; width: 1px; }
.sweep {
  position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 0deg,
    rgba(56,189,248,0) 0deg, rgba(56,189,248,.4) 45deg, rgba(56,189,248,0) 90deg);
  animation: radar-spin 4s linear infinite;
}
.core {
  position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px;
  border-radius: 50%; background: #818cf8; box-shadow: 0 0 12px 2px rgba(129,140,248,.7);
}
.blip { position: absolute; width: 8px; height: 8px; border-radius: 50%; transform: translate(-50%,-50%); animation: blip-ping 3s ease-out infinite; }
.blip.ok     { color: #34d399; background: #34d399; }
.blip.ok2    { color: #38bdf8; background: #38bdf8; }
.blip.review { color: #fbbf24; background: #fbbf24; }
.blip.threat { color: #f43f5e; background: #f43f5e; width: 10px; height: 10px; animation: blip-threat 1.8s ease-out infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes radar-spin { to { transform: rotate(360deg); } }
@keyframes blip-ping {
  0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70%  { box-shadow: 0 0 0 11px transparent; opacity: .55; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: .55; }
}
@keyframes blip-threat {
  0%   { box-shadow: 0 0 0 0 rgba(244,63,94,.8); opacity: 1; transform: translate(-50%,-50%) scale(1); }
  60%  { box-shadow: 0 0 0 15px rgba(244,63,94,0); opacity: 1; transform: translate(-50%,-50%) scale(1.25); }
  100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); opacity: .9; transform: translate(-50%,-50%) scale(1); }
}
@media (prefers-reduced-motion: reduce) { .sweep, .blip, .spinner { animation: none; } }
</style>
