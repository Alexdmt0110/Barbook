import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FolderDetail, FolderPage, FolderQuery, FolderReference } from './folder.models';

@Injectable({ providedIn: 'root' })
export class FoldersService {
  private readonly http = inject(HttpClient);
  browse(query: FolderQuery = {}) {
    let params = new HttpParams();
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.pageSize !== undefined) params = params.set('pageSize', query.pageSize);
    return this.http.get<FolderPage>('/api/folders/browse', { params });
  }
  get(id: string) {
    return this.http.get<FolderDetail>(this.path(id));
  }
  create(name: string) {
    return this.http.post<FolderReference>('/api/folders', { name });
  }
  rename(id: string, name: string, expectedVersion: number) {
    return this.http.patch<FolderDetail>(this.path(id), { name, expectedVersion });
  }
  remove(id: string, expectedVersion: number) {
    return this.http.delete<{ deleted: true }>(this.path(id), {
      params: new HttpParams().set('expectedVersion', expectedVersion),
    });
  }
  addCocktails(id: string, cocktailIds: readonly string[]) {
    return this.http.post<{ added: number }>(`${this.path(id)}/cocktails`, { cocktailIds });
  }
  removeCocktail(id: string, cocktailId: string) {
    return this.http.delete<{ removed: number }>(
      `${this.path(id)}/cocktails/${encodeURIComponent(cocktailId)}`,
    );
  }
  private path(id: string) {
    return `/api/folders/${encodeURIComponent(id)}`;
  }
}
