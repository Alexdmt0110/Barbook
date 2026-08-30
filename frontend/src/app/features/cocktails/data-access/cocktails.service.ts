import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CocktailDetail,
  CocktailSummary,
  CreateCocktailRequest,
  CreateCocktailResult,
} from './cocktail.models';

@Injectable({
  providedIn: 'root',
})
export class CocktailsService {
  private readonly http = inject(HttpClient);

  getPersonalCocktails(): Observable<CocktailSummary[]> {
    return this.http.get<CocktailSummary[]>('/api/cocktails');
  }

  getPersonalCocktail(slug: string): Observable<CocktailDetail> {
    return this.http.get<CocktailDetail>(`/api/cocktails/${encodeURIComponent(slug)}`);
  }

  createPersonalCocktail(cocktail: CreateCocktailRequest): Observable<CreateCocktailResult> {
    return this.http.post<CreateCocktailResult>('/api/cocktails', cocktail);
  }
}
