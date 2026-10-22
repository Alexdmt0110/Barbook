import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthResponse } from './auth.models';
import { SessionResume } from './session-resume';

describe('Private document resume', () => {
  let reply: Subject<AuthResponse>;
  let revalidate: ReturnType<typeof vi.fn>;
  let expire: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let service: SessionResume;
  let epoch: number;
  let authenticated: boolean;
  let uncertain: boolean;
  beforeEach(() => {
    epoch = 1;
    authenticated = true;
    uncertain = false;
    reply = new Subject<AuthResponse>();
    revalidate = vi.fn(() => reply);
    expire = vi.fn(() => {
      authenticated = false;
      epoch++;
    });
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => authenticated,
            revalidateSession: revalidate,
            epoch: () => epoch,
            logoutUncertain: () => uncertain,
            expire,
          },
        },
        { provide: Router, useValue: { url: '/cocktails/new', navigate } },
      ],
    });
    service = TestBed.inject(SessionResume);
  });
  afterEach(() => TestBed.resetTestingModule());
  function show(): void {
    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event);
  }
  it('masks before snapshot and reveals only after fresh server confirmation', () => {
    window.dispatchEvent(new Event('pagehide'));
    expect(document.documentElement.getAttribute('data-session-paused')).toBe('true');
    expect(revalidate).not.toHaveBeenCalled();
    show();
    expect(revalidate).toHaveBeenCalledOnce();
    expect(service.checking()).toBe(true);
    reply.next({} as AuthResponse);
    reply.complete();
    expect(service.checking()).toBe(false);
    expect(document.documentElement.hasAttribute('data-session-paused')).toBe(false);
    expect(expire).not.toHaveBeenCalled();
  });
  it('cannot unmask a hidden snapshot when an earlier verification resolves late', () => {
    show();
    window.dispatchEvent(new Event('pagehide'));
    reply.next({} as AuthResponse);
    reply.complete();
    expect(document.documentElement.hasAttribute('data-session-paused')).toBe(true);
    reply = new Subject<AuthResponse>();
    show();
    expect(revalidate).toHaveBeenCalledTimes(2);
    reply.next({} as AuthResponse);
    reply.complete();
    expect(document.documentElement.hasAttribute('data-session-paused')).toBe(false);
  });
  it('fails closed on a network or authorization error without claiming server revocation', async () => {
    show();
    reply.error(new Error('not confirmed'));
    expect(expire).toHaveBeenCalledWith();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/cocktails/new' },
    });
    await Promise.resolve();
    expect(document.documentElement.hasAttribute('data-session-paused')).toBe(false);
  });
  it.each(['new identity', 'voluntary logout'])(
    'ignores an old revalidation failure after %s',
    (mode) => {
      show();
      epoch++;
      if (mode === 'voluntary logout') {
        authenticated = false;
        uncertain = true;
      }
      reply.error(new Error('old response'));
      expect(expire).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});
