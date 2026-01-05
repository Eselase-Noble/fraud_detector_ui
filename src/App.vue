<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-gray-100">
    <NavBar />
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
