import { Routes } from '@angular/router';
import { draftExitGuard } from './core/drafts/draft-exit.guard';
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
        path: 'folders',
        title: 'Dossiers · Barbook',
        loadComponent: () =>
          import('./features/folders/folder-index/folder-index').then(
            (module) => module.FolderIndex,
          ),
      },
      {
        path: 'folders/:id',
        title: 'Dossier · Barbook',
        loadComponent: () =>
          import('./features/folders/folder-detail/folder-detail').then(
            (module) => module.FolderDetail,
          ),
      },
      {
        path: 'cocktails',
        title: 'Mes cocktails · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktails').then((module) => module.Cocktails),
      },
      {
        path: 'cocktails/new',
        canDeactivate: [draftExitGuard],
        title: 'Nouveau cocktail · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktail-create/cocktail-create').then(
            (module) => module.CocktailCreate,
          ),
      },
      {
        path: 'cocktails/:slug',
        canDeactivate: [draftExitGuard],
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
