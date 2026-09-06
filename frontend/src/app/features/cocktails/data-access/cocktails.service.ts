import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CocktailDetail,
  CocktailListQuery,
  CocktailListResult,
  CocktailOrganizationResult,
  CocktailSummaryFolder,
  CocktailSummaryTag,
  CreateCocktailFolderRequest,
  CreateCocktailRequest,
  CreateCocktailResult,
  UpdateCocktailOrganizationRequest,
} from './cocktail.models';

@Injectable({
  providedIn: 'root',
})
export class CocktailsService {
  private readonly http = inject(HttpClient);

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

    return this.http.get<CocktailListResult>('/api/cocktails', {
      params,
    });
  }

  getPersonalCocktail(slug: string): Observable<CocktailDetail> {
    return this.http.get<CocktailDetail>(`/api/cocktails/${encodeURIComponent(slug)}`);
  }

  createPersonalCocktail(cocktail: CreateCocktailRequest): Observable<CreateCocktailResult> {
    return this.http.post<CreateCocktailResult>('/api/cocktails', cocktail);
  }

  getPersonalFolders(): Observable<CocktailSummaryFolder[]> {
    return this.http.get<CocktailSummaryFolder[]>('/api/folders');
  }

  createPersonalFolder(folder: CreateCocktailFolderRequest): Observable<CocktailSummaryFolder> {
    return this.http.post<CocktailSummaryFolder>('/api/folders', folder);
  }

  getPersonalTags(): Observable<CocktailSummaryTag[]> {
    return this.http.get<CocktailSummaryTag[]>('/api/tags');
  }

  updatePersonalCocktailOrganization(
    slug: string,
    organization: UpdateCocktailOrganizationRequest,
  ): Observable<CocktailOrganizationResult> {
    return this.http.put<CocktailOrganizationResult>(
      `/api/cocktails/${encodeURIComponent(slug)}/organization`,
      organization,
    );
  }
}
