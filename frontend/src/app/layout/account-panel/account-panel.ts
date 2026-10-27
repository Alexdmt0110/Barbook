import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { GlobalLogout } from '../../core/auth/global-logout';

@Component({
  selector: 'app-account-panel',
  imports: [GlobalLogout],
  template: `
    <button
      #trigger
      type="button"
      class="account-trigger bb-button bb-button--ghost"
      aria-label="Compte et sécurité"
      aria-controls="account-panel"
      [attr.aria-expanded]="visible()"
      (click)="toggle()"
    >
      <span class="account-name">{{ auth.currentUser()?.displayName || 'Compte' }}</span>
      <span class="initial" aria-hidden="true">{{
        auth.currentUser()?.displayName?.charAt(0) || 'B'
      }}</span>
    </button>
    <section
      id="account-panel"
      class="account-panel"
      aria-label="Compte et sécurité"
      [hidden]="!visible()"
    >
      <div class="panel-heading">
        <h2>Compte et sécurité</h2>
        <button
          type="button"
          class="bb-button bb-button--ghost"
          aria-label="Fermer le panneau utilisateur"
          [disabled]="auth.globalLogoutUncertain()"
          (click)="close()"
        >
          Fermer
        </button>
      </div>
      @if (auth.currentUser(); as user) {
        <dl>
          <dt>Nom</dt>
          <dd>{{ user.displayName }}</dd>
          <dt>Adresse email</dt>
          <dd>{{ user.email }}</dd>
        </dl>
      }
      <app-global-logout />
    </section>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    .account-trigger {
      padding: 0.35rem 0.65rem;
    }
    .account-name {
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .initial {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      background: var(--color-accent-soft-strong);
      color: var(--color-accent);
    }
    .account-panel {
      position: absolute;
      z-index: 30;
      right: 0;
      top: calc(100% + 1rem);
      width: min(38rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 8rem);
      overflow: auto;
      padding: var(--space-6);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-card);
      background: var(--color-surface-solid);
      color: var(--color-text);
      box-shadow: var(--shadow-card);
    }
    .account-panel[hidden] {
      display: none;
    }
    .panel-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    h2 {
      margin: 0;
      font-size: 1.2rem;
    }
    dl {
      margin: var(--space-6) 0;
    }
    dt {
      color: var(--color-text-muted);
      margin-top: var(--space-3);
    }
    dd {
      margin: var(--space-1) 0 0;
      overflow-wrap: anywhere;
    }
    @media (max-width: 1100px) {
      .account-name {
        display: none;
      }
      .account-panel {
        position: fixed;
        right: 1rem;
        top: 5rem;
      }
    }
  `,
})
export class AccountPanel {
  readonly auth = inject(AuthService);
  readonly opened = signal(false);
  @ViewChild(GlobalLogout) security?: GlobalLogout;
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  visible(): boolean {
    return this.opened() || this.auth.globalLogoutUncertain();
  }
  toggle(): void {
    if (this.visible()) this.close();
    else this.opened.set(true);
  }
  close(): void {
    if (this.auth.globalLogoutUncertain()) return;
    this.security?.cancel();
    this.opened.set(false);
    this.trigger?.nativeElement.focus();
  }
  @HostListener('keydown.escape', ['$event']) escape(event: Event): void {
    if (!this.visible()) return;
    event.preventDefault();
    this.close();
  }
}
