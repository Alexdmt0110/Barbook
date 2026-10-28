import { WorkspaceContext } from '../../../core/workspaces/workspace-context';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CocktailsService } from './cocktails.service';
import { completeContent } from '../cocktail-edit/cocktail-edit.test-fixture';

describe('Personal content HTTP transport', () => {
  it('uses the stable escaped ID and forwards the original precondition and raw modes without retry', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(WorkspaceContext)
      .confirmSession({
        user: { id: 'qa', email: 'qa@example.test', displayName: 'QA' },
        workspaceId: 'personal-qa',
        csrfToken: 'csrf',
      })
      .subscribe();
    const service = TestBed.inject(CocktailsService);
    const http = TestBed.inject(HttpTestingController);
    service.getPersonalCocktailContent('id/test').subscribe();
    http.expectOne('/api/cocktails/id/id%2Ftest/content').flush({ contentVersion: 7 });
    const payload = { ...completeContent(), expectedContentVersion: 7 };
    let error = false;
    service.replacePersonalCocktailContent('id/test', payload).subscribe({
      error: () => {
        error = true;
      },
    });
    const put = http.expectOne('/api/cocktails/id/id%2Ftest/content');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(payload);
    put.flush({}, { status: 409, statusText: 'Conflict' });
    expect(error).toBe(true);
    http.expectNone('/api/cocktails/id/id%2Ftest/content');
    http.verify();
  });
});
