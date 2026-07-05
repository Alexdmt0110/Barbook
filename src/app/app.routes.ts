import { Routes } from '@angular/router';
import { CocktailDetail } from './pages/cocktail-detail/cocktail-detail';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'cocktails/:slug',
    component: CocktailDetail,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
