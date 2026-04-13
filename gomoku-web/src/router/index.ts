import { createRouter, createWebHistory } from 'vue-router';
import AgentView from '../views/AgentView.vue';
import GameView from '../games/gomoku/views/GameView.vue';
import LoginView from '../views/LoginView.vue';
import AdminView from '../views/AdminView.vue';
import ChineseChessView from '../games/chinese-chess/views/ChineseChessView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'agent',
      component: AgentView,
      meta: { requiresAuth: true }
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: true }
    },
    {
      path: '/chinese-chess',
      name: 'chinese-chess',
      component: ChineseChessView,
      meta: { requiresAuth: true }
    }
  ]
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token');

  // 检查是否需要认证
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
    return;
  }

  // 检查是否要求未登录（如登录页）
  if (to.meta.requiresGuest && isAuthenticated) {
    next('/');
    return;
  }

  next();
});

export default router;
