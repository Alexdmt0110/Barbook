import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, finalize, timeout } from 'rxjs';
import { AuthService } from './auth.service';

/** A document restored from BFCache does not run Angular's route guard again. */
@Injectable({ providedIn: 'root' })
export class SessionResume {
  readonly checking = signal(false);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private pending?: Subscription;
  private running = false;
  private hidden = false;
  private destroyed = false;

  constructor() {
    const window = this.document.defaultView;
    if (!window) return;
    const hide = () => {
      if (!this.auth.isAuthenticated()) return;
      this.hidden = true;
      this.pending?.unsubscribe();
      this.mask();
    };
    const show = (event: PageTransitionEvent) => {
      const needsCheck = this.hidden || event.persisted;
      this.hidden = false;
      if (needsCheck) this.resume();
    };
    const visible = () => {
      if (
        !this.hidden &&
        this.document.visibilityState === 'visible' &&
        this.auth.isAuthenticated()
      )
        this.resume();
    };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    this.document.addEventListener('visibilitychange', visible);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      this.document.removeEventListener('visibilitychange', visible);
      this.pending?.unsubscribe();
      this.document.documentElement.removeAttribute('data-session-paused');
    });
  }

  private mask(): void {
    // Synchronous CSS before the browser snapshots the document, not a deferred render.
    this.document.documentElement.setAttribute('data-session-paused', 'true');
    this.checking.set(true);
  }

  private reveal(): void {
    if (this.hidden || this.destroyed) return;
    this.document.documentElement.removeAttribute('data-session-paused');
    this.checking.set(false);
  }

  private resume(): void {
    if (this.running) return;
    this.running = true;
    this.mask();
    const returnUrl = this.router.url;
    const request = this.auth.revalidateSession();
    const epoch = this.auth.epoch();
    const subscription = request
      .pipe(
        timeout(15000),
        finalize(() => {
          this.running = false;
          this.pending = undefined;
        }),
      )
      .subscribe({
        next: () => this.reveal(),
        error: () => {
          if (
            epoch !== this.auth.epoch() &&
            (this.auth.isAuthenticated() || this.auth.logoutUncertain())
          ) {
            this.reveal();
            return;
          }
          if (epoch === this.auth.epoch()) this.auth.expire(); // Network / expiry preserves drafts; interceptor purges revoked ones.
          void this.router.navigate(['/login'], { queryParams: { returnUrl } }).then(
            () => this.reveal(),
            () => this.reveal(),
          );
        },
      });
    this.pending = subscription.closed ? undefined : subscription;
  }
}
