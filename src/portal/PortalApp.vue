<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { token, clearToken } from '@/portal/auth'
import { getSession } from '@/portal/api'
import type { PortalProfile } from '@/portal/types'
import Login from '@/portal/Login.vue'
import PortalShell from '@/portal/PortalShell.vue'

const profile = ref<PortalProfile | null>(null)
const booting = ref(true)

onMounted(async () => {
  // Resume a saved session if the token is still valid.
  if (token.value) {
    try { profile.value = await getSession() }
    catch { clearToken() }
  }
  booting.value = false
})

const onAuthed = (p: PortalProfile) => { profile.value = p }
const onSignout = () => { clearToken(); profile.value = null }
</script>

<template>
  <div v-if="booting" class="min-h-screen grid place-items-center text-slate-400 text-sm">
    <div class="inline-flex items-center gap-2">
      <span class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      Loading…
    </div>
  </div>
  <PortalShell v-else-if="profile" :profile="profile" @signout="onSignout" @refresh="onAuthed" />
  <Login v-else @authed="onAuthed" />
</template>
