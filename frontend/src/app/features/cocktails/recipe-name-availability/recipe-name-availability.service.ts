import { timeout } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { WorkspaceContext } from '../../../core/workspaces/workspace-context';

export type RecipeNameStatus = 'AVAILABLE' | 'NAME_TAKEN' | 'SLUG_RESERVED';
export interface RecipeNameAvailabilityResult {
  canonicalName: string;
  status: RecipeNameStatus;
}

@Injectable({ providedIn: 'root' })
export class RecipeNameAvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceContext);
  check(name: string, cocktailId?: string) {
    let params = new HttpParams().set('name', name);
    if (cocktailId) params = params.set('cocktailId', cocktailId);
    return this.workspace
      .request('cocktail-name-availability', false, (url) =>
        this.http.get<RecipeNameAvailabilityResult>(url, { params }),
      )
      .pipe(timeout(5000));
  }
}
