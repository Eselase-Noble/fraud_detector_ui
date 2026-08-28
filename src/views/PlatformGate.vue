<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { staffToken, staffUser, clearStaffToken } from '@/platform/auth'
import { staffMe } from '@/api/platform'
import OperatorLogin from '@/views/OperatorLogin.vue'
import AppShell from '@/components/AppShell.vue'

const authed = ref(false)
const booting = ref(true)

onMounted(async () => {
  if (staffToken.value) {
    try { staffUser.value = await staffMe(); authed.value = true }
    catch { clearStaffToken() }
  }
  booting.value = false
})
</script>

<template>
  <div v-if="booting" class="min-h-screen grid place-items-center bg-slate-900 text-slate-400 text-sm">
    <span class="inline-flex items-center gap-2">
      <span class="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Loading console…
    </span>
  </div>
  <AppShell v-else-if="authed" />
  <OperatorLogin v-else @authed="authed = true" />
</template>
