import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Theme, type Theme as ThemeValue } from '../../../core/theme/theme.models';
import { ThemeService } from '../../../core/theme/theme.service';

interface ThemeOption {
  value: ThemeValue;
  label: string;
  description: string;
}

@Component({
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.css',
})
export class ThemeSwitcher {
  private readonly themeService = inject(ThemeService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('themeTrigger');

  readonly isOpen = signal(false);

  readonly options: readonly ThemeOption[] = [
    {
      value: Theme.Dark,
      label: 'Sombre',
      description: 'Le thème Barbook par défaut.',
    },
    {
      value: Theme.Light,
      label: 'Clair',
      description: 'Une interface lumineuse et chaleureuse.',
    },
    {
      value: Theme.HighContrast,
      label: 'Contraste élevé',
      description: 'Lisibilité renforcée et contours marqués.',
    },
  ];

  readonly currentTheme = this.themeService.currentTheme;

  readonly currentThemeLabel = computed(
    () => this.options.find((option) => option.value === this.currentTheme())?.label ?? 'Sombre',
  );

  toggleMenu(): void {
    this.isOpen.update((isOpen) => !isOpen);
  }

  selectTheme(theme: ThemeValue): void {
    this.themeService.setTheme(theme);
    this.closeAndRestoreFocus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;

    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isOpen()) {
      return;
    }

    this.closeAndRestoreFocus();
  }

  private closeAndRestoreFocus(): void {
    this.isOpen.set(false);

    queueMicrotask(() => {
      this.trigger()?.nativeElement.focus();
    });
  }
}
