import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeSwitcher } from '../../../shared/ui/theme-switcher/theme-switcher';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, ThemeSwitcher],
  templateUrl: './register.html',
  styleUrl: '../auth-page.css',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly passwordVisible = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],

    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],

    password: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(128)]],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();

      return;
    }

    this.isSubmitting.set(true);

    this.errorMessage.set(null);

    this.authService
      .register(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/');
        },

        error: (error: unknown) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    if (error.status === 0) {
      return 'Impossible de joindre le serveur. Réessaie dans quelques instants.';
    }

    if (error.status === 409) {
      return 'Un compte existe déjà avec cette adresse email.';
    }

    if (error.status === 400) {
      return 'Certaines informations ne sont pas valides.';
    }

    if (error.status === 429) {
      return 'Trop de tentatives de création de compte. Réessaie plus tard.';
    }

    return 'La création du compte a échoué. Réessaie dans quelques instants.';
  }
}
