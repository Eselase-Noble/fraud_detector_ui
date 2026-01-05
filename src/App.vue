<script setup lang="ts">
import TheNavbar from "@/components/TheNavbar.vue";
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-gray-100">
    <TheNavbar />
    <main class="pt-20">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* Smooth font rendering */
body {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
</style>
