import { createRouter, createWebHistory } from 'vue-router';
import AgentView from '../views/AgentView.vue';
import GameView from '../views/GameView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'agent',
      component: AgentView
    },
    {
      path: '/game',
      name: 'game',
      component: GameView
    }
  ]
});

export default router;
