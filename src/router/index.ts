import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginPage from '../pages/LoginPage.vue'
import DashboardPage from '../pages/DashboardPage.vue'
import UsersPage from '../pages/UsersPage.vue'
import ScreensPage from '../pages/ScreensPage.vue'
import ControlPage from '../pages/ControlPage.vue'
import PreviewPage from '../pages/PreviewPage.vue'
import MatchHistoryPage from '../pages/MatchHistoryPage.vue'
import ScreenMatchHistoryPage from '../pages/ScreenMatchHistoryPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: UsersPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/screens',
      name: 'screens',
      component: ScreensPage,
      meta: { requiresAuth: true },
    },
    {
    path: '/matches/:id/history',
    name: 'match-history',
    component: MatchHistoryPage,
    meta: { requiresAuth: true },
    },
    {
      path: '/screens/:id/control',
      name: 'screen-control',
      component: ControlPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/screens/:id/preview',
      name: 'screen-preview',
      component: PreviewPage,
      meta: { requiresAuth: true },
    },
    {
    path: '/screens/:id/history',
    name: 'screen-match-history',
    component: ScreenMatchHistoryPage,
    meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login'
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return '/dashboard'
  }
})

export default router