import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Theme, type Theme as ThemeValue } from '../../../core/theme/theme.models';
import { ThemeService } from '../../../core/theme/theme.service';
import { ThemeSwitcher } from './theme-switcher';

class ThemeServiceStub {
  readonly currentTheme = signal<ThemeValue>(Theme.Dark);

  readonly selectedThemes: ThemeValue[] = [];

  setTheme(theme: ThemeValue): void {
    this.selectedThemes.push(theme);
    this.currentTheme.set(theme);
  }
}

describe('ThemeSwitcher', () => {
  let themeService: ThemeServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSwitcher],
      providers: [
        {
          provide: ThemeService,
          useClass: ThemeServiceStub,
        },
      ],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService) as unknown as ThemeServiceStub;
  });

  it('shows the current theme in the trigger accessibility label', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);

    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.theme-trigger') as HTMLButtonElement;

    expect(trigger.getAttribute('aria-label')).toBe('Thème d’affichage : Sombre');

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the theme selection panel', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);

    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.theme-trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.theme-option');

    expect(options.length).toBe(3);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    expect(fixture.nativeElement.textContent).toContain('Sombre');

    expect(fixture.nativeElement.textContent).toContain('Clair');

    expect(fixture.nativeElement.textContent).toContain('Contraste élevé');
  });

  it('selects a theme and closes the panel', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);

    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.theme-trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.theme-option');

    const lightOption = options[1] as HTMLButtonElement;

    lightOption.click();
    fixture.detectChanges();

    expect(themeService.selectedThemes).toEqual([Theme.Light]);

    expect(themeService.currentTheme()).toBe(Theme.Light);

    expect(fixture.nativeElement.querySelector('.theme-panel')).toBeNull();

    expect(trigger.getAttribute('aria-label')).toBe('Thème d’affichage : Clair');
  });

  it('marks the current theme as selected', () => {
    themeService.currentTheme.set(Theme.HighContrast);

    const fixture = TestBed.createComponent(ThemeSwitcher);

    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.theme-trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const selectedOption = fixture.nativeElement.querySelector(
      '.theme-option.selected',
    ) as HTMLButtonElement | null;

    expect(selectedOption).not.toBeNull();

    expect(selectedOption?.getAttribute('aria-pressed')).toBe('true');

    expect(selectedOption?.textContent).toContain('Contraste élevé');
  });

  it('closes the panel when Escape is pressed', () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);

    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.theme-trigger') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.theme-panel')).not.toBeNull();

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
      }),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.theme-panel')).toBeNull();
  });
});
