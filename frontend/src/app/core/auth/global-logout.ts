import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-global-logout',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    @if (auth.isAuthenticated() || auth.globalLogoutUncertain()) {
      <section aria-label="Sécurité des sessions">
        @if (!confirming()) {
          <button type="button" (click)="confirming.set(true)">
            Déconnecter tous les appareils
          </button>
        } @else {
          <form (submit)="confirm($event)" aria-label="Confirmer la déconnexion globale">
            <h2>Déconnecter tous les appareils</h2>
            <p>
              Confirme avec ton mot de passe. Les brouillons de ce navigateur seront abandonnés dès
              la confirmation, même si le mot de passe ou le réseau empêchent la déconnexion. Les
              autres appareils seront révoqués après vérification serveur.
            </p>
            <label for="global-logout-password">Mot de passe pour déconnexion globale</label>
            <input
              id="global-logout-password"
              type="password"
              autocomplete="current-password"
              [formControl]="password"
              maxlength="128"
              [attr.aria-invalid]="password.touched && password.invalid"
              aria-describedby="global-logout-help"
            />
            <p id="global-logout-help">
              Le mot de passe est requis à chaque tentative. Aucune nouvelle tentative automatique.
            </p>
            @if (error()) {
              <p role="alert">{{ error() }}</p>
            }
            <div class="actions">
              <button type="submit" [disabled]="password.invalid || auth.logoutPending()">
                Confirmer la déconnexion globale
              </button>
              @if (!auth.globalLogoutUncertain()) {
                <button type="button" [disabled]="auth.logoutPending()" (click)="cancel()">
                  Annuler
                </button>
              }
            </div>
            @if (auth.globalLogoutUncertain()) {
              <p>
                <a routerLink="/login">Se reconnecter</a> pour relancer ensuite la déconnexion
                globale.
              </p>
            }
          </form>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      max-width: 72rem;
      margin: 0 auto;
      padding: 1rem;
    }
    form {
      max-width: 40rem;
    }
    label,
    input {
      display: block;
    }
    input {
      width: 100%;
      max-width: 24rem;
      margin-block: 0.5rem;
      padding: 0.75rem;
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
    }
    button {
      min-height: 44px;
      padding: 0.5rem 1rem;
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      cursor: pointer;
      white-space: normal;
    }
    button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
  `,
})
export class GlobalLogout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly confirming = signal(false);
  readonly error = signal('');
  readonly password = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(128)],
  });

  cancel(): void {
    this.password.reset();
    this.error.set('');
    this.confirming.set(false);
  }

  confirm(event: Event): void {
    event.preventDefault();
    if (this.password.invalid || this.auth.logoutPending()) return;
    this.error.set('');
    const request = this.auth.logoutAll(this.password.value);
    this.password.reset();
    const epoch = this.auth.epoch();
    request.subscribe({
      next: () => {
        void this.router.navigateByUrl('/login');
      },
      error: (error: unknown) => {
        // A late result after another identity must not change its screen.
        if (!this.auth.globalLogoutUncertain() || this.auth.epoch() !== epoch + 1) return;
        this.error.set(
          error instanceof HttpErrorResponse && error.error?.code === 'REAUTHENTICATION_FAILED'
            ? 'Mot de passe refusé. La déconnexion globale n’est pas confirmée. Saisis à nouveau ton mot de passe.'
            : 'Déconnexion globale non confirmée. Réessaie explicitement avec ton mot de passe ; si la session est révoquée ou expirée, reconnecte-toi puis relance cette action.',
        );
      },
    });
  }
}
