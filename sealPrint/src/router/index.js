import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    meta: {
      title: '首页',
    },
    component: () => import('@/views/index.vue'),
  },
  {
    path: '/config',
    name: 'config',
    meta: {
      title: '配置项'
    },
    component:()=>import('@/components/docs/customConfig.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;