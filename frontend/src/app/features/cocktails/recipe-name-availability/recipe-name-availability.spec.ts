import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { vi } from 'vitest';
import { WorkspaceContext } from '../../../core/workspaces/workspace-context';
import { DraftStore } from '../../../core/drafts/draft-store.service';
import { RecipeNameAvailability } from './recipe-name-availability';

const path = '/api/cocktail-name-availability';
describe('Advisory recipe-name check with identity/context and cancellation guards', () => {
  let fixture: ComponentFixture<RecipeNameAvailability>,
    http: HttpTestingController,
    control: FormControl<string>,
    workspace: WorkspaceContext;
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [RecipeNameAvailability],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    workspace = TestBed.inject(WorkspaceContext);
    workspace
      .confirmSession({
        user: { id: 'alice', email: 'alice@example.test', displayName: 'Alice' },
        workspaceId: 'personal-a',
        csrfToken: 'csrf',
      })
      .subscribe();
    http = TestBed.inject(HttpTestingController);
    control = new FormControl('', {
      nonNullable: true,
      validators: [Validators.minLength(2), Validators.maxLength(120)],
    });
    fixture = TestBed.createComponent(RecipeNameAvailability);
    fixture.componentRef.setInput('nameControl', control);
    fixture.componentRef.setInput('value', '');
    fixture.componentRef.setInput('messageId', 'name-status');
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });
  function name(value: string) {
    control.setValue(value);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  }
  function wait() {
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
  }
  it('debounces to one bounded read and exposes a polite accessible message', () => {
    name('Mo');
    vi.advanceTimersByTime(200);
    name('Mójito');
    vi.advanceTimersByTime(399);
    http.expectNone((r) => r.url === path);
    vi.advanceTimersByTime(1);
    const request = http.expectOne((r) => r.url === path && r.params.get('name') === 'Mójito');
    expect(request.request.method).toBe('GET');
    request.flush({ canonicalName: 'mojito', status: 'AVAILABLE' });
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('AVAILABLE');
    const message = (fixture.nativeElement as HTMLElement).querySelector('#name-status');
    expect(message?.getAttribute('aria-live')).toBe('polite');
    expect(message?.textContent).toContain('pour le moment');
  });
  it.each(['NAME_TAKEN', 'SLUG_RESERVED'] as const)(
    'explains %s with text, including expired retention, without changing form validity',
    (status) => {
      name('Mojito');
      wait();
      http.expectOne((r) => r.url === path).flush({ canonicalName: 'mojito', status });
      fixture.detectChanges();
      expect(fixture.componentInstance.hasConflict()).toBe(true);
      expect(fixture.componentInstance.message()).toContain(
        status === 'NAME_TAKEN' ? '30 jours' : 'délai de restauration',
      );
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[aria-hidden="true"]')?.textContent,
      ).toContain('⚠');
      expect(control.valid).toBe(true);
    },
  );
  it('cancels the old request as soon as another name is rendered and only accepts its own canonical response', () => {
    name('Mojito');
    wait();
    const old = http.expectOne((r) => r.url === path);
    name('Negroni');
    expect(old.cancelled).toBe(true);
    wait();
    http.expectOne((r) => r.url === path).flush({ canonicalName: 'mojito', status: 'NAME_TAKEN' });
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('UNKNOWN');
    expect(fixture.componentInstance.hasConflict()).toBe(false);
  });
  it('does not mistake network failure for a taken name or block an explicit save', () => {
    name('Mojito');
    wait();
    http.expectOne((r) => r.url === path).error(new ProgressEvent('network'));
    expect(fixture.componentInstance.state()).toBe('UNKNOWN');
    expect(fixture.componentInstance.message()).toContain('Tu peux tenter');
    expect(control.valid).toBe(true);
  });
  it('bounds an unresponsive advisory read and leaves an explicit save possible', () => {
    name('Mojito');
    wait();
    const pending = http.expectOne((r) => r.url === path);
    vi.advanceTimersByTime(5000);
    expect(pending.cancelled).toBe(true);
    expect(fixture.componentInstance.state()).toBe('UNKNOWN');
    expect(fixture.componentInstance.message()).toContain('Tu peux tenter');
    expect(control.valid).toBe(true);
  });
  it('includes the current recipe in edit checks and sees a silent server/draft reset', () => {
    fixture.componentRef.setInput('cocktailId', 'current-recipe');
    name('Mojito');
    wait();
    http
      .expectOne((r) => r.url === path && r.params.get('cocktailId') === 'current-recipe')
      .flush({ canonicalName: 'mojito', status: 'AVAILABLE' });
    control.setValue('Menthe', { emitEvent: false });
    fixture.componentRef.setInput('value', control.value);
    fixture.detectChanges();
    wait();
    http
      .expectOne((r) => r.url === path && r.params.get('name') === 'Menthe')
      .flush({ canonicalName: 'menthe', status: 'AVAILABLE' });
    expect(fixture.componentInstance.state()).toBe('AVAILABLE');
  });
  it('cancels on account/context change and cannot apply the old identity response', () => {
    name('Mojito');
    wait();
    const old = http.expectOne((r) => r.url === path);
    workspace.suspend();
    fixture.detectChanges();
    expect(old.cancelled).toBe(true);
    expect(fixture.componentInstance.state()).toBe('IDLE');
    workspace
      .confirmSession({
        user: { id: 'bob', email: 'bob@example.test', displayName: 'Bob' },
        workspaceId: 'personal-b',
        csrfToken: 'other',
      })
      .subscribe();
    fixture.detectChanges();
    wait();
    http.expectOne((r) => r.url === path).flush({ canonicalName: 'mojito', status: 'AVAILABLE' });
    expect(fixture.componentInstance.state()).toBe('AVAILABLE');
  });
  it('ignores a response after the draft identity lease was revoked', () => {
    name('Mojito');
    wait();
    const pending = http.expectOne((r) => r.url === path);
    TestBed.inject(DraftStore).suspend();
    pending.flush({ canonicalName: 'mojito', status: 'NAME_TAKEN' });
    expect(fixture.componentInstance.hasConflict()).toBe(false);
  });
  it('does not overwrite a definitive name conflict with an older advisory response', () => {
    name('Mojito');
    wait();
    const pending = http.expectOne((r) => r.url === path);
    fixture.componentInstance.identifiedConflict(
      new HttpErrorResponse({ status: 409, error: { code: 'COCKTAIL_NAME_TAKEN' } }),
      control.value,
    );
    pending.flush({ canonicalName: 'mojito', status: 'AVAILABLE' });
    expect(fixture.componentInstance.state()).toBe('NAME_TAKEN');
    name('Mojito maison');
    wait();
    http
      .expectOne((r) => r.url === path)
      .flush({ canonicalName: 'mojito-maison', status: 'AVAILABLE' });
    expect(fixture.componentInstance.state()).toBe('AVAILABLE');
  });
  it('does not attach a late submission conflict to a different current name', () => {
    name('Mojito');
    const submitted = control.value;
    name('Menthe');
    fixture.componentInstance.identifiedConflict(
      new HttpErrorResponse({ status: 409, error: { code: 'COCKTAIL_NAME_TAKEN' } }),
      submitted,
    );
    expect(fixture.componentInstance.hasConflict()).toBe(false);
    wait();
    http.expectOne((r) => r.url === path).flush({ canonicalName: 'menthe', status: 'AVAILABLE' });
    expect(fixture.componentInstance.state()).toBe('AVAILABLE');
  });
  it('does not send checks for empty, invalid or noncanonical names and cancels on destruction', () => {
    for (const value of ['', 'A', '!!!', 'a'.repeat(121)]) {
      name(value);
      wait();
      http.expectNone((r) => r.url === path);
    }
    name('Mojito');
    wait();
    const pending = http.expectOne((r) => r.url === path);
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
