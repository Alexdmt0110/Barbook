import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { Theme, themes } from './theme.models';

const THEME_STORAGE_KEY = 'barbook.theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly currentTheme = signal<Theme>(Theme.Dark);

  initialize(): void {
    const storedTheme = this.readStoredTheme();

    this.applyTheme(storedTheme, false);
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme, true);
  }

  private applyTheme(theme: Theme, persist: boolean): void {
    this.currentTheme.set(theme);

    const documentElement = this.document.documentElement;

    documentElement.dataset['theme'] = theme;
    documentElement.style.colorScheme = theme === Theme.Light ? 'light' : 'dark';

    if (persist) {
      this.writeStoredTheme(theme);
    }
  }

  private readStoredTheme(): Theme {
    const storage = this.getStorage();

    if (!storage) {
      return Theme.Dark;
    }

    try {
      const storedTheme = storage.getItem(THEME_STORAGE_KEY);

      return this.isTheme(storedTheme) ? storedTheme : Theme.Dark;
    } catch {
      return Theme.Dark;
    }
  }

  private writeStoredTheme(theme: Theme): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // A blocked storage must not prevent Barbook from working.
    }
  }

  private getStorage(): Storage | null {
    return this.document.defaultView?.localStorage ?? null;
  }

  private isTheme(value: string | null): value is Theme {
    return value !== null && themes.includes(value as Theme);
  }
}
