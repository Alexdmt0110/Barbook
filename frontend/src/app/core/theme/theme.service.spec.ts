import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Theme } from './theme.models';
import { ThemeService } from './theme.service';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('ThemeService', () => {
  let service: ThemeService;
  let storage: MemoryStorage;

  let documentElement: {
    dataset: Record<string, string>;
    style: {
      colorScheme: string;
    };
  };

  beforeEach(() => {
    storage = new MemoryStorage();

    documentElement = {
      dataset: {},
      style: {
        colorScheme: '',
      },
    };

    const documentMock = {
      documentElement,
      defaultView: {
        localStorage: storage,
      },
    } as unknown as Document;

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        {
          provide: DOCUMENT,
          useValue: documentMock,
        },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  it('uses the dark theme by default', () => {
    service.initialize();

    expect(service.currentTheme()).toBe(Theme.Dark);
    expect(documentElement.dataset['theme']).toBe(Theme.Dark);
    expect(documentElement.style.colorScheme).toBe('dark');
  });

  it('restores a stored light theme', () => {
    storage.setItem('barbook.theme', Theme.Light);

    service.initialize();

    expect(service.currentTheme()).toBe(Theme.Light);
    expect(documentElement.dataset['theme']).toBe(Theme.Light);
    expect(documentElement.style.colorScheme).toBe('light');
  });

  it('falls back to dark when the stored theme is invalid', () => {
    storage.setItem('barbook.theme', 'invalid-theme');

    service.initialize();

    expect(service.currentTheme()).toBe(Theme.Dark);
    expect(documentElement.dataset['theme']).toBe(Theme.Dark);
  });

  it('applies and persists a selected theme', () => {
    service.setTheme(Theme.HighContrast);

    expect(service.currentTheme()).toBe(Theme.HighContrast);

    expect(documentElement.dataset['theme']).toBe(Theme.HighContrast);

    expect(documentElement.style.colorScheme).toBe('dark');

    expect(storage.getItem('barbook.theme')).toBe(Theme.HighContrast);
  });

  it('does not persist the default theme during initialization', () => {
    service.initialize();

    expect(storage.getItem('barbook.theme')).toBeNull();
  });
});
