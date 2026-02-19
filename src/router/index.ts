import { createRouter, createWebHistory } from 'vue-router'
import Landing     from '@/views/Landing.vue'
import DetectFraud from '@/views/DetectFraud.vue'
import UploadData  from '@/views/UploadData.vue'
import Analytics   from '@/views/Analytics.vue'
import AdminPanel  from '@/views/AdminPanel.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',          component: Landing,     meta: { title: 'Sentinel — Home' } },
    { path: '/detect',    component: DetectFraud,  meta: { title: 'Detect Fraud' } },
    { path: '/upload',    component: UploadData,   meta: { title: 'Knowledge Base' } },
    { path: '/analytics', component: Analytics,    meta: { title: 'Analytics' } },
    { path: '/admin',     component: AdminPanel,   meta: { title: 'Admin · Operations' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = (to.meta.title as string) ?? 'Sentinel'
})

export default router
