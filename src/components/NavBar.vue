<script lang="ts">

</script>
<template>
  <nav class="fixed top-0 w-full z-50 backdrop-blur bg-black/70 border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="font-bold text-xl text-indigo-400">
        Financial Fraud Detector AI
      </div>

      <div class="flex gap-6 text-sm">
        <RouterLink to="/" class="hover:text-indigo-400">Home</RouterLink>
        <RouterLink to="/detect" class="hover:text-indigo-400">Detect</RouterLink>
        <RouterLink to="/upload" class="hover:text-indigo-400">Upload</RouterLink>
        <RouterLink to="/analytics" class="hover:text-indigo-400">Analytics</RouterLink>
      </div>
    </div>
  </nav>
</template>
