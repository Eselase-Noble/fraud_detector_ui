import { createRouter, createWebHistory } from 'vue-router'
import PortalApp    from '@/portal/PortalApp.vue'
import PlatformGate from '@/views/PlatformGate.vue'
import Dashboard    from '@/views/Dashboard.vue'
import Transactions from '@/views/Transactions.vue'
import DetectFraud  from '@/views/DetectFraud.vue'
import UploadData   from '@/views/UploadData.vue'
import Analytics    from '@/views/Analytics.vue'
import AdminPanel   from '@/views/AdminPanel.vue'
import Subscribers  from '@/views/Subscribers.vue'
import Users        from '@/views/Users.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Partner / client portal — the site root. Its own email+password login.
    { path: '/', component: PortalApp, meta: { title: 'Sentinel — Partner Portal' } },

    // Operator console — Sentinel staff only, gated by a separate staff login.
    {
      path: '/platform',
      component: PlatformGate,
      children: [
        { path: '',             component: Dashboard,    meta: { title: 'Sentinel — Console' } },
        { path: 'transactions', component: Transactions, meta: { title: 'Transactions' } },
        { path: 'detect',       component: DetectFraud,  meta: { title: 'Detect Fraud' } },
        { path: 'analytics',    component: Analytics,     meta: { title: 'Analytics' } },
        { path: 'users',        component: Users,         meta: { title: 'Users & Risk' } },
        { path: 'upload',       component: UploadData,    meta: { title: 'Knowledge Base' } },
        { path: 'subscribers',  component: Subscribers,   meta: { title: 'Partner Institutions' } },
        { path: 'admin',        component: AdminPanel,    meta: { title: 'Admin & Audit' } },
      ],
    },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = (to.meta.title as string) ?? 'Sentinel'
})

export default router
