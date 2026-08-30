import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((module) => module.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((module) => module.Register),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell').then((module) => module.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home').then((module) => module.Home),
      },
      {
        path: 'cocktails',
        loadComponent: () =>
          import('./features/cocktails/cocktails').then((module) => module.Cocktails),
      },
      {
        path: 'cocktails/new',
        loadComponent: () =>
          import('./features/cocktails/cocktail-create/cocktail-create').then(
            (module) => module.CocktailCreate,
          ),
      },
      {
        path: 'cocktails/:slug',
        loadComponent: () =>
          import('./features/cocktails/cocktail-detail/cocktail-detail').then(
            (module) => module.CocktailDetail,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
