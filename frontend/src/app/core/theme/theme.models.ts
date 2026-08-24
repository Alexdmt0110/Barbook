export const Theme = {
  Dark: 'dark',
  Light: 'light',
  HighContrast: 'high-contrast',
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

export const themes: readonly Theme[] = [Theme.Dark, Theme.Light, Theme.HighContrast];
