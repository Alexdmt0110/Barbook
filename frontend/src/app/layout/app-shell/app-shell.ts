import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GlobalLogout } from '../../core/auth/global-logout';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeSwitcher } from '../../shared/ui/theme-switcher/theme-switcher';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ThemeSwitcher, GlobalLogout],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        /* The shell keeps private content hidden and offers retry. */
      },
    });
  }
}
