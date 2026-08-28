import { createRouter, createWebHistory } from 'vue-router'
import Dashboard    from '@/views/Dashboard.vue'
import Transactions from '@/views/Transactions.vue'
import DetectFraud  from '@/views/DetectFraud.vue'
import UploadData   from '@/views/UploadData.vue'
import Analytics    from '@/views/Analytics.vue'
import AdminPanel   from '@/views/AdminPanel.vue'
import Users        from '@/views/Users.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',             component: Dashboard,    meta: { title: 'Sentinel — Dashboard' } },
    { path: '/transactions', component: Transactions, meta: { title: 'Transactions' } },
    { path: '/detect',       component: DetectFraud,  meta: { title: 'Detect Fraud' } },
    { path: '/analytics',    component: Analytics,     meta: { title: 'Analytics' } },
    { path: '/users',        component: Users,         meta: { title: 'Users & Risk' } },
    { path: '/upload',       component: UploadData,    meta: { title: 'Knowledge Base' } },
    { path: '/admin',        component: AdminPanel,    meta: { title: 'Admin · Operations' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = (to.meta.title as string) ?? 'Sentinel'
})

export default router
