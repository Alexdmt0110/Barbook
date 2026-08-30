import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IngredientSuggestion } from './ingredient.models';

@Injectable({
  providedIn: 'root',
})
export class IngredientsService {
  private readonly http = inject(HttpClient);

  searchPersonalIngredients(query: string): Observable<IngredientSuggestion[]> {
    return this.http.get<IngredientSuggestion[]>(
      `/api/ingredients?query=${encodeURIComponent(query)}`,
    );
  }
}
