<!--FileUpload.vue-->
<script setup lang="ts">

import { ref } from "vue"
import { uploadDocument } from "@/api/documents"

const file = ref<File | null>(null)
const loading = ref(false)
const success = ref(false)

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
  success.value = false
}

const upload = async () => {
  if (!file.value) return

  loading.value = true
  success.value = false

  try {
    await uploadDocument(file.value)
    success.value = true
    file.value = null
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="min-h-screen bg-neutral-950 text-white px-6 py-24">
    <div class="max-w-3xl mx-auto">

      <!-- HEADER -->
      <header class="mb-14 text-center">
        <h1
          class="text-4xl md:text-5xl font-extrabold tracking-tight
                 bg-gradient-to-br from-white via-gray-200 to-gray-400
                 bg-clip-text text-transparent"
        >
          Upload Knowledge & Data
        </h1>

        <p class="mt-4 text-gray-400 max-w-xl mx-auto">
          Upload fraud intelligence, transaction datasets, or reference
          documents to enhance RAG-powered detection.
        </p>
      </header>

      <!-- UPLOAD CARD -->
      <div
        class="relative rounded-2xl border border-white/10 bg-white/5
               backdrop-blur p-10
               transition-all duration-300
               shadow-[0_0_80px_-40px_rgba(99,102,241,0.4)]"
      >
        <!-- DROP ZONE -->
        <label
          class="group flex flex-col items-center justify-center gap-4
                 rounded-xl border-2 border-dashed border-white/15
                 bg-black/40 px-6 py-16 text-center
                 cursor-pointer transition
                 hover:border-indigo-400 hover:bg-black/60"
        >
          <input
            type="file"
            class="hidden"
            @change="onFileChange"
          />

          <svg
            class="h-10 w-10 text-gray-400 transition group-hover:text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M7 16a4 4 0 01.88-7.903A5 5 0 1116 8h1a3 3 0 010 6H7z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 12v6m0 0l-3-3m3 3l3-3"
            />
          </svg>

          <div class="text-sm text-gray-400">
            <span class="text-gray-200 font-medium">
              Click to upload
            </span>
            or drag and drop
          </div>

          <div class="text-xs text-gray-500">
            PDF, CSV, JSON, or TXT
          </div>
        </label>

        <!-- FILE INFO -->
        <div
          v-if="file"
          class="mt-6 flex items-center justify-between
                 rounded-lg border border-white/10 bg-black/30 px-4 py-3"
        >
          <span class="truncate text-sm text-gray-300">
            {{ file.name }}
          </span>
          <button
            @click="file = null"
            class="text-xs text-gray-400 hover:text-red-400 transition"
          >
            Remove
          </button>
        </div>

        <!-- ACTION -->
        <div class="mt-10 flex justify-end">
          <button
            @click="upload"
            :disabled="!file || loading"
            class="relative inline-flex items-center justify-center
                   rounded-xl bg-indigo-600 px-10 py-4 font-semibold
                   transition-all duration-300
                   hover:bg-indigo-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.8)]"
          >
            <span v-if="!loading">Upload File</span>
            <span v-else class="flex items-center gap-2">
              <svg
                class="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Uploading…
            </span>
          </button>
        </div>

        <!-- SUCCESS -->
        <div
          v-if="success"
          class="mt-8 animate-fade-in rounded-lg
                 border border-emerald-400/30 bg-emerald-400/10
                 px-4 py-3 text-sm text-emerald-300"
        >
          ✅ File uploaded and indexed successfully.
        </div>
      </div>

    </div>
  </section>
  <!-- FOOTER -->
  <footer class="py-16 text-center text-sm text-gray-500">
    &copy; 2026
    <a href="https://nobleson.info" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700">
      Noble Eselase Vulley
    </a>
    and
    <a href="https://africodelab.net" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-700">
      AfricodeLab
    </a>
    · Built with FastAPI · PostgreSQL · LangChain · FAISS · Tavily · Vue 3 · TypeScript
  </footer>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.35s ease-out both;
}
</style>
