import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CocktailSummary } from './cocktail.models';

@Injectable({
  providedIn: 'root',
})
export class CocktailsService {
  private readonly http = inject(HttpClient);

  getPersonalCocktails(): Observable<CocktailSummary[]> {
    return this.http.get<CocktailSummary[]>('/api/cocktails');
  }
}
