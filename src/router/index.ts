import { createRouter, createWebHistory } from 'vue-router'
import DetectFraud from '@/views/DetectFraud.vue'
import UploadData from '@/views/UploadData.vue'
import Landing from '@/views/Landing.vue'
import Analytics from '@/views/Analytics.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/', component: Landing,
    },
    { path: "/detect", component: DetectFraud },
    { path: "/upload", component: UploadData },
    { path: "/analytics", component: Analytics }
  ],
})

export default router
