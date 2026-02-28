import { createRouter, createWebHistory } from 'vue-router';
import DashboardSection from '../sections/DashboardSection.vue';

const routes = [
    {
        path: '/',
        name: 'dashboard',
        component: DashboardSection,
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/subjects',
        name: 'subjects',
        component: () => import('../sections/SubjectsSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/timetable',
        name: 'timetable',
        component: () => import('../sections/TimetableSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/agenda',
        name: 'agenda',
        component: () => import('../sections/AgendaSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/records',
        name: 'records',
        component: () => import('../sections/RecordsSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/pomodoro',
        name: 'pomodoro',
        component: () => import('../sections/PomodoroSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/communities',
        name: 'communities',
        component: () => import('../sections/CommunitiesSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/assistant',
        name: 'assistant',
        component: () => import('../sections/AssistantSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/focus-music',
        name: 'focus-music',
        component: () => import('../sections/FocusMusicSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/profile',
        name: 'profile',
        component: () => import('../sections/ProfileSection.vue'),
        meta: {
            requiresAuth: false
        }
    },
    // Catch all invalid routes
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    }
});
