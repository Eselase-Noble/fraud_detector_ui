<script setup lang="ts">
// Root: routes decide which world renders — partner portal at "/", operator
// console (behind its own staff login) at "/platform".
import ConfirmHost from '@/components/ConfirmHost.vue'
</script>

<template>
  <RouterView />
  <ConfirmHost />
</template>

<style>
body {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
