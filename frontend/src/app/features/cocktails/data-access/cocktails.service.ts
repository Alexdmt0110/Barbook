import { WorkspaceContext } from '../../../core/workspaces/workspace-context';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { CocktailContentSnapshot, ReplaceCocktailContentRequest } from './cocktail-content.models';
import {
  CocktailDetail,
  CocktailListQuery,
  CocktailListResult,
  CocktailOrganizationResult,
  CocktailSummaryFolder,
  CocktailSummaryTag,
  CreateCocktailRequest,
  CreateCocktailResult,
  UpdateCocktailOrganizationRequest,
} from './cocktail.models';

@Injectable({
  providedIn: 'root',
})
export class CocktailsService {
  private readonly http = inject(HttpClient);
  readonly workspace = inject(WorkspaceContext);

  getPersonalCocktails(query: CocktailListQuery = {}): Observable<CocktailListResult> {
    let params = new HttpParams();

    const search = query.search?.trim();
    const folderId = query.folderId?.trim();
    const tagId = query.tagId?.trim();

    if (search) {
      params = params.set('search', search);
    }

    if (query.type) {
      params = params.set('type', query.type);
    }

    if (query.method) {
      params = params.set('method', query.method);
    }

    if (folderId) {
      params = params.set('folderId', folderId);
    }

    if (tagId) {
      params = params.set('tagId', tagId);
    }

    if (query.page !== undefined) {
      params = params.set('page', query.page.toString());
    }

    if (query.pageSize !== undefined) {
      params = params.set('pageSize', query.pageSize.toString());
    }

    return this.workspace.request('cocktails', false, (url) =>
      this.http.get<CocktailListResult>(url, { params }),
    );
  }

  getPersonalCocktail(slug: string): Observable<CocktailDetail> {
    return this.workspace.request(`cocktails/${encodeURIComponent(slug)}`, false, (url) =>
      this.http.get<CocktailDetail>(url),
    );
  }

  createPersonalCocktail(cocktail: CreateCocktailRequest): Observable<CreateCocktailResult> {
    return this.workspace.request(
      'cocktails',
      true,
      (url) => this.http.post<CreateCocktailResult>(url, cocktail),
      cocktail.expectedAccessVersion,
    );
  }

  getPersonalCocktailContent(id: string): Observable<CocktailContentSnapshot> {
    return this.workspace.request(`cocktails/id/${encodeURIComponent(id)}/content`, false, (url) =>
      this.http.get<CocktailContentSnapshot>(url),
    );
  }

  replacePersonalCocktailContent(
    id: string,
    content: ReplaceCocktailContentRequest,
  ): Observable<CocktailContentSnapshot> {
    return this.workspace.request(
      `cocktails/id/${encodeURIComponent(id)}/content`,
      true,
      (url) => this.http.put<CocktailContentSnapshot>(url, content),
      content.expectedAccessVersion,
    );
  }

  getPersonalFolders(): Observable<CocktailSummaryFolder[]> {
    if (this.workspace.current()?.kind === 'SHARED') return of([]);
    return this.workspace.request('folders', false, (url) =>
      this.http.get<CocktailSummaryFolder[]>(url),
    );
  }

  getPersonalTags(): Observable<CocktailSummaryTag[]> {
    if (this.workspace.current()?.kind === 'SHARED') return of([]);
    return this.workspace.request('tags', false, (url) => this.http.get<CocktailSummaryTag[]>(url));
  }

  updatePersonalCocktailOrganization(
    slug: string,
    organization: UpdateCocktailOrganizationRequest,
  ): Observable<CocktailOrganizationResult> {
    if (this.workspace.current()?.kind === 'SHARED')
      return throwError(() => new Error('Le classement partagé n’est pas disponible.'));
    return this.http.put<CocktailOrganizationResult>(
      `/api/cocktails/${encodeURIComponent(slug)}/organization`,
      organization,
    );
  }
}
