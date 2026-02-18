<!--NavBar.vue-->
<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()

const links = [
  { to: '/',          label: 'Home' },
  { to: '/detect',    label: 'Detect' },
  { to: '/upload',    label: 'Upload' },
  { to: '/analytics', label: 'Analytics' },
]
</script>

<template>
  <nav class="fixed top-0 w-full z-50 backdrop-blur bg-black/70 border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

      <RouterLink to="/" class="flex items-center gap-2 group">
        <div
          class="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center
                 text-white text-xs font-bold transition group-hover:bg-indigo-500"
        >S</div>
        <span class="font-bold text-base text-white">
          Sentinel <span class="text-indigo-400">AI</span>
        </span>
      </RouterLink>

      <div class="flex items-center gap-1 text-sm">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="px-4 py-2 rounded-lg transition-all"
          :class="route.path === link.to
            ? 'bg-indigo-600/20 text-indigo-400 font-medium'
            : 'text-gray-400 hover:text-white hover:bg-white/5'"
        >
          {{ link.label }}
        </RouterLink>
      </div>

    </div>
  </nav>
</template>
