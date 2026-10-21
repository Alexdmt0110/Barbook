import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { Theme, themes } from './theme.models';

const THEME_STORAGE_KEY = 'barbook.theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(BrowserStorageService);

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
    const storedTheme = this.storage.read('local', THEME_STORAGE_KEY);
    return this.isTheme(storedTheme) ? storedTheme : Theme.Dark;
  }

  private writeStoredTheme(theme: Theme): void {
    this.storage.write('local', THEME_STORAGE_KEY, theme);
  }

  private isTheme(value: string | null): value is Theme {
    return value !== null && themes.includes(value as Theme);
  }
}
