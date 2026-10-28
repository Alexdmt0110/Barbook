import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  FolderDetail,
  FolderPage,
  FolderQuery,
  FolderReference,
  FolderDeletionPreview,
  RecipePrecondition,
} from './folder.models';

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
  deletionPreview(id: string) {
    return this.http.get<FolderDeletionPreview>(`${this.path(id)}/deletion-preview`);
  }
  remove(id: string, expectedVersion: number, expectedMembershipToken: string) {
    return this.http.delete<{ deleted: true }>(this.path(id), {
      params: new HttpParams()
        .set('expectedVersion', expectedVersion)
        .set('expectedMembershipToken', expectedMembershipToken),
    });
  }
  addCocktails(id: string, expectedVersions: readonly RecipePrecondition[]) {
    return this.http.post<{ added: number }>(`${this.path(id)}/cocktails`, {
      cocktailIds: expectedVersions.map((item) => item.cocktailId),
      expectedVersions,
    });
  }
  removeCocktail(id: string, cocktailId: string, expectedVersion: number) {
    return this.http.delete<{ removed: number }>(
      `${this.path(id)}/cocktails/${encodeURIComponent(cocktailId)}`,
      { params: new HttpParams().set('expectedVersion', expectedVersion) },
    );
  }
  private path(id: string) {
    return `/api/folders/${encodeURIComponent(id)}`;
  }
}
