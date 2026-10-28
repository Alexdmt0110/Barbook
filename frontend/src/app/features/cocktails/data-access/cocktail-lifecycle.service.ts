import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { RecipeLifecycle, TrashPage } from './cocktail-lifecycle.models';
export type { RecipeLifecycle, TrashPage } from './cocktail-lifecycle.models';

@Injectable({ providedIn: 'root' })
export class CocktailLifecycleService {
  private readonly http = inject(HttpClient);
  private path(id: string) {
    return `/api/cocktails/id/${encodeURIComponent(id)}`;
  }
  get(id: string) {
    return this.http.get<RecipeLifecycle>(`${this.path(id)}/lifecycle`);
  }
  list(page: number) {
    return this.http.get<TrashPage>('/api/cocktails/trash/entries', {
      params: { page, pageSize: 20 },
    });
  }
  change(state: RecipeLifecycle, restore: boolean) {
    const body = {
      expectedContentVersion: state.contentVersion,
      expectedOrganizationVersion: state.organizationVersion,
    };
    return restore
      ? this.http.post<RecipeLifecycle>(`${this.path(state.id)}/restore`, body)
      : this.http.delete<RecipeLifecycle>(this.path(state.id), { body });
  }
}
