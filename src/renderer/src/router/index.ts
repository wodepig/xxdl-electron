import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/About.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue')
    },
    {
      path: '/version',
      name: 'version',
      component: () => import('../components/VersionInfo.vue')
    },
    {
      path: '/log',
      name: 'log',
      component: () => import('../components/LogList.vue')
    }
  ]
})

export default router

