import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion · Barbook',
    loadComponent: () => import('./features/auth/login/login').then((module) => module.Login),
  },
  {
    path: 'register',
    title: 'Inscription · Barbook',
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
        title: 'Accueil · Barbook',
        loadComponent: () => import('./features/home/home').then((module) => module.Home),
      },
      {
        path: 'cocktails',
        title: 'Mes cocktails · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktails').then((module) => module.Cocktails),
      },
      {
        path: 'cocktails/new',
        title: 'Nouveau cocktail · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktail-create/cocktail-create').then(
            (module) => module.CocktailCreate,
          ),
      },
      {
        path: 'cocktails/:slug',
        title: 'Cocktail · Barbook',
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
