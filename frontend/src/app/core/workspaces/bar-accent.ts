import { Directive, computed, inject } from '@angular/core';
import { ThemeService } from '../theme/theme.service';
import { Theme } from '../theme/theme.models';
import { WorkspaceContext } from './workspace-context';

export const barAccents = ['AMBER', 'RED', 'TEAL', 'BLUE'] as const;
export type BarAccent = (typeof barAccents)[number];
export const barAccentNames: Record<BarAccent, string> = {
  AMBER: 'Ambre',
  RED: 'Rouge',
  TEAL: 'Sarcelle',
  BLUE: 'Bleu',
};
export function accentTokens(accent: BarAccent | undefined, theme: Theme) {
  if (!accent || theme === Theme.HighContrast) return null;
  const dark = theme === Theme.Dark;
  const color = (
    dark
      ? { AMBER: '#f1b57c', RED: '#ff9198', TEAL: '#5fd8c8', BLUE: '#8bb8ff' }
      : { AMBER: '#873f19', RED: '#981b28', TEAL: '#005b55', BLUE: '#1c4d99' }
  )[accent];
  return {
    color,
    on: dark ? '#24120b' : '#fffaf7',
    soft: `color-mix(in srgb, ${color} 9%, transparent)`,
    strong: `color-mix(in srgb, ${color} 17%, transparent)`,
  };
}

/** Scoped to the confirmed business shell; never changes the user's mode or security tokens. */
@Directive({
  selector: '[appBarAccent]',
  host: {
    '[style.--color-accent]': 'tokens()?.color ?? null',
    '[style.--color-on-accent]': 'tokens()?.on ?? null',
    '[style.--color-accent-soft]': 'tokens()?.soft ?? null',
    '[style.--color-accent-soft-strong]': 'tokens()?.strong ?? null',
  },
})
export class BarAccentDirective {
  private readonly workspace = inject(WorkspaceContext);
  private readonly theme = inject(ThemeService);
  readonly tokens = computed(() => {
    const context = this.workspace.current();
    return accentTokens(
      context?.kind === 'SHARED' ? context.accentKey : undefined,
      this.theme.currentTheme(),
    );
  });
}
