import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Theme } from '../theme/theme.models';
import { ThemeService } from '../theme/theme.service';
import { BarAccentDirective, accentTokens, barAccents } from './bar-accent';
import { BusinessWorkspace, WorkspaceContext } from './workspace-context';
@Component({ imports: [BarAccentDirective], template: '<div appBarAccent>Content</div>' })
class Host {}
describe('Confirmed Bar accent scope', () => {
  it('overrides only four accent variables, follows mode and removes overrides on Personnel, suspension and high contrast', () => {
    const context = signal<BusinessWorkspace | null>({
      id: 'bar',
      userId: 'u',
      name: 'Bar',
      kind: 'SHARED',
      role: 'MEMBER',
      accessVersion: 0,
      accentKey: 'RED',
    });
    const mode = signal<Theme>(Theme.Dark);
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        { provide: WorkspaceContext, useValue: { current: context } },
        { provide: ThemeService, useValue: { currentTheme: mode } },
      ],
    });
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    const element = (f.nativeElement as HTMLElement).querySelector('div')!;
    expect(element.style.getPropertyValue('--color-accent')).toBe('#ff9198');
    expect(Array.from(element.style)).toEqual([
      '--color-accent',
      '--color-on-accent',
      '--color-accent-soft',
      '--color-accent-soft-strong',
    ]);
    mode.set(Theme.Light);
    f.detectChanges();
    expect(element.style.getPropertyValue('--color-accent')).toBe('#981b28');
    mode.set(Theme.HighContrast);
    f.detectChanges();
    expect(element.style.length).toBe(0);
    mode.set(Theme.Dark);
    context.update((c) => ({ ...c!, kind: 'PERSONAL' }));
    f.detectChanges();
    expect(element.style.length).toBe(0);
    context.set(null);
    f.detectChanges();
    expect(element.style.length).toBe(0);
  });
  it('defines every bounded palette in both ordinary modes without overriding high contrast', () => {
    for (const key of barAccents) {
      expect(accentTokens(key, Theme.Dark)?.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(accentTokens(key, Theme.Light)?.on).toBe('#fffaf7');
      expect(accentTokens(key, Theme.HighContrast)).toBe(null);
      for (const mode of [Theme.Dark, Theme.Light]) {
        const tokens = accentTokens(key, mode)!;
        expect(contrast(tokens.color, tokens.on)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(accentTokens(undefined, Theme.Dark)).toBe(null);
  });
});

function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const c = hex
      .slice(1)
      .match(/../g)!
      .map((n) => parseInt(n, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
