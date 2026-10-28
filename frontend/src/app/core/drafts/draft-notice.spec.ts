import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { DraftStore } from './draft-store.service';
import { FormDraft } from './form-draft';
import { DraftNotice } from './draft-notice';

describe('Uncertain draft library navigation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [DraftNotice], providers: [provideRouter([])] });
  });
  afterEach(() => sessionStorage.clear());
  it.each([false, true])(
    'binds the router target consistently with the business context (same tab=%s)',
    (sameTab) => {
      const store = TestBed.inject(DraftStore);
      store.confirmIdentity({ userId: 'qa', workspaceId: 'workspace' });
      const draft = new FormDraft(store, 'create:new', 1, () => true);
      expect(draft.begin({ name: 'uncertain' })).toBe(true);
      draft.rejected(new HttpErrorResponse({ status: 0 }));
      const f = TestBed.createComponent(DraftNotice);
      f.componentRef.setInput('draft', draft);
      if (sameTab) f.componentRef.setInput('libraryInSameTab', true);
      f.detectChanges();
      const link = f.debugElement.query(By.directive(RouterLink));
      expect(link.injector.get(RouterLink).target).toBe(sameTab ? undefined : '_blank');
      expect((link.nativeElement as HTMLAnchorElement).getAttribute('target')).toBe(
        sameTab ? null : '_blank',
      );
      expect(link.nativeElement.textContent).toContain(sameTab ? 'de cet espace' : 'autre onglet');
      expect(draft.uncertain()).toBe(true);
    },
  );
});
