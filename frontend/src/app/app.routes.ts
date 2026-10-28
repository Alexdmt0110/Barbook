import { personalSpaceGuard } from './core/workspaces/personal-space.guard';
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
        path: 'trash',
        canActivate: [personalSpaceGuard],
        title: 'Corbeille · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktail-trash/cocktail-trash').then((m) => m.CocktailTrash),
      },
      {
        path: 'cocktails/id/:id/delete',
        canActivate: [personalSpaceGuard],
        title: 'Mettre en corbeille · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktail-trash/cocktail-delete').then(
            (m) => m.CocktailDelete,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        title: 'Accueil · Barbook',
        loadComponent: () => import('./features/home/home').then((module) => module.Home),
      },
      {
        path: 'folders',
        canActivate: [personalSpaceGuard],
        title: 'Dossiers · Barbook',
        loadComponent: () =>
          import('./features/folders/folder-index/folder-index').then(
            (module) => module.FolderIndex,
          ),
      },
      {
        path: 'folders/:id',
        canActivate: [personalSpaceGuard],
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
        path: 'cocktails/id/:id/edit',
        canDeactivate: [draftExitGuard],
        title: 'Modifier la recette · Barbook',
        loadComponent: () =>
          import('./features/cocktails/cocktail-edit/cocktail-edit').then(
            (module) => module.CocktailEdit,
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
