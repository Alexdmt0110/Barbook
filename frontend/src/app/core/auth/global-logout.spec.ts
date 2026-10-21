import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { defer, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { GlobalLogout } from './global-logout';

describe('GlobalLogout confirmation', () => {
  it('keeps cancellation harmless and clears the password before reporting a failed reauthentication', () => {
    let epoch = 1;
    const uncertain = signal(false);
    const reply = new Subject<void>();
    const logoutAll = vi.fn(() =>
      defer(() => {
        epoch++;
        uncertain.set(true);
        return reply;
      }),
    );
    TestBed.configureTestingModule({
      imports: [GlobalLogout],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            globalLogoutUncertain: uncertain,
            logoutPending: () => false,
            epoch: () => epoch,
            logoutAll,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(GlobalLogout);
    const component = fixture.componentInstance;
    component.confirming.set(true);
    component.password.setValue('cancelled');
    component.cancel();
    expect(logoutAll).not.toHaveBeenCalled();
    expect(component.password.value).toBe('');
    component.confirming.set(true);
    component.password.setValue('wrong');
    component.confirm(new Event('submit', { cancelable: true }));
    expect(logoutAll).toHaveBeenCalledWith('wrong');
    expect(component.password.value).toBe('');
    reply.error(new HttpErrorResponse({ status: 401, error: { code: 'REAUTHENTICATION_FAILED' } }));
    expect(component.error()).toContain('Mot de passe refusé');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Annuler');
  });
});
