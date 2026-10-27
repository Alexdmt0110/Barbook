import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { GlobalLogout } from '../../core/auth/global-logout';
import { AccountPanel } from './account-panel';

describe('Account panel', () => {
  const uncertain = signal(false);
  beforeEach(() => {
    uncertain.set(false);
    TestBed.configureTestingModule({
      imports: [AccountPanel],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ displayName: 'Alex', email: 'alex@example.test' }),
            globalLogoutUncertain: uncertain,
          },
        },
      ],
    });
    TestBed.overrideComponent(GlobalLogout, { set: { template: '', imports: [] } });
  });
  it('opens explicitly and restores keyboard focus on Escape', () => {
    const fixture = TestBed.createComponent(AccountPanel);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector('button')!;
    expect(host.querySelector<HTMLElement>('section')!.hidden).toBe(true);
    fixture.componentInstance.security?.password.setValue('Transient password');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    host
      .querySelector('section')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelector<HTMLElement>('section')!.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(fixture.componentInstance.security?.password.value).toBe('');
  });
  it('keeps the same security component mounted and cannot hide an uncertain result', () => {
    const fixture = TestBed.createComponent(AccountPanel);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const child = host.querySelector('app-global-logout');
    uncertain.set(true);
    fixture.detectChanges();
    fixture.componentInstance.close();
    fixture.detectChanges();
    expect(host.querySelector<HTMLElement>('section')!.hidden).toBe(false);
    expect(host.querySelector('app-global-logout')).toBe(child);
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="Fermer le panneau utilisateur"]')!
        .disabled,
    ).toBe(true);
  });
});
