<!-- NavBar.vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
defineOptions({ name: 'NavBar' })
const route = useRoute()
const isActive = (path: string) => route.path === path || (path !== '/' && route.path.startsWith(path))
</script>

<template>
  <nav class="navbar">
    <RouterLink to="/" class="nav-brand">
      <span class="logo-mark">S</span>
      <span class="brand-text">SENTINEL</span>
    </RouterLink>

    <div class="nav-links">
      <RouterLink
        v-for="link in [
          { path: '/',          label: 'Home'       },
          { path: '/detect',    label: 'Detect'     },
          { path: '/analytics', label: 'Analytics'  },
          { path: '/upload',    label: 'Knowledge'  },
          { path: '/admin',     label: 'Admin'      },
        ]"
        :key="link.path"
        :to="link.path"
        :class="['nav-link', isActive(link.path) && 'active', link.path === '/admin' && 'admin-link']"
      >
        {{ link.label }}
        <span v-if="link.path === '/admin'" class="admin-pip"/>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Archivo:wght@600;700&display=swap');

.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: 44px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  background: rgba(4,5,7,.92); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.nav-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; }
.logo-mark {
  width: 22px; height: 22px; border-radius: 4px;
  background: #6366f1; color: #fff; font-size: 11px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Mono', monospace;
}
.brand-text { font-size: 11px; font-weight: 700; letter-spacing: .18em; color: #dde3ed; font-family: 'Archivo', sans-serif; }
.nav-links  { display: flex; align-items: center; gap: 2px; }
.nav-link {
  position: relative; padding: 5px 12px; border-radius: 6px;
  font-size: 11px; font-weight: 600; letter-spacing: .1em;
  color: #5a6478; text-decoration: none; transition: all .2s;
  font-family: 'Archivo', sans-serif;
}
.nav-link:hover { color: #dde3ed; background: rgba(255,255,255,.05); }
.nav-link.active { color: #dde3ed; background: rgba(99,102,241,.15); }
.admin-link { color: #8896ab; }
.admin-link:hover, .admin-link.active { color: #ff4444; background: rgba(255,68,68,.1); }
.admin-pip {
  position: absolute; top: 4px; right: 4px;
  width: 4px; height: 4px; border-radius: 50%;
  background: #ff4444; box-shadow: 0 0 6px #ff4444;
}
</style>
