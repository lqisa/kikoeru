import type { RouteRecordRaw } from 'vue-router';

function prefixRoutes(prefix: string, routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map((route) => {
    route.path = prefix + '' + route.path;
    return route;
  });
}

const routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      { path: '', component: () => import('pages/Dashboard/Folders.vue') },
      { path: 'scanner', component: () => import('pages/Dashboard/Scanner.vue') },
      { path: 'advanced', component: () => import('pages/Dashboard/Advanced.vue') },
      { path: 'usermanage', component: () => import('pages/Dashboard/UserManage.vue') },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { name: 'works' } },
      { path: 'works', name: 'works', component: () => import('pages/Works.vue') },
      { path: 'work/:id', component: () => import('pages/Work.vue') },
      {
        path: 'circles',
        props: { restrict: 'circles' },
        component: () => import('pages/List.vue'),
      },
      { path: 'tags', props: { restrict: 'tags' }, component: () => import('pages/List.vue') },
      { path: 'vas', props: { restrict: 'vas' }, component: () => import('pages/List.vue') },
      ...prefixRoutes('favourites', [
        { path: '', props: { route: 'review' }, component: () => import('pages/Favourites.vue') },
        {
          path: '/review',
          props: { route: 'review' },
          component: () => import('pages/Favourites.vue'),
        },
        ...prefixRoutes('/progress', [
          {
            path: '',
            props: { route: 'progress', progress: 'marked' },
            component: () => import('pages/Favourites.vue'),
          },
          {
            path: '/marked',
            props: { route: 'progress', progress: 'marked' },
            component: () => import('pages/Favourites.vue'),
          },
          {
            path: '/listening',
            props: { route: 'progress', progress: 'listening' },
            component: () => import('pages/Favourites.vue'),
          },
          {
            path: '/listened',
            props: { route: 'progress', progress: 'listened' },
            component: () => import('pages/Favourites.vue'),
          },
          {
            path: '/replay',
            props: { route: 'progress', progress: 'replay' },
            component: () => import('pages/Favourites.vue'),
          },
          {
            path: '/postponed',
            props: { route: 'progress', progress: 'postponed' },
            component: () => import('pages/Favourites.vue'),
          },
        ]),
        {
          path: '/folder',
          props: { route: 'folder' },
          component: () => import('pages/Favourites.vue'),
        },
      ]),
    ],
    meta: { auth: true },
  },
  {
    path: '/login',
    component: () => import('pages/Login.vue'),
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
