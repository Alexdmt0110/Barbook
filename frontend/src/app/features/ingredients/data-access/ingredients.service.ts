import { WorkspaceContext } from '../../../core/workspaces/workspace-context';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IngredientSuggestion } from './ingredient.models';

@Injectable({
  providedIn: 'root',
})
export class IngredientsService {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceContext);

  searchPersonalIngredients(query: string): Observable<IngredientSuggestion[]> {
    return this.workspace.request(`ingredients?query=${encodeURIComponent(query)}`, false, (url) =>
      this.http.get<IngredientSuggestion[]>(url),
    );
  }
}
