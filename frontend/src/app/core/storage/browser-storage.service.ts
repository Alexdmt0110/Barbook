import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type BrowserStorageArea = 'local' | 'session';

/** Best-effort persistence; callers retain their own authoritative memory state. */
@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  private readonly document = inject(DOCUMENT);

  read(area: BrowserStorageArea, key: string): string | null {
    try {
      return this.storage(area)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  write(area: BrowserStorageArea, key: string, value: string): boolean {
    try {
      const storage = this.storage(area);
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(area: BrowserStorageArea, key: string): boolean {
    try {
      const storage = this.storage(area);
      if (!storage) return false;
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  private storage(area: BrowserStorageArea): Storage | null {
    // This getter can itself throw SecurityError, before a method is reached.
    return this.document.defaultView?.[area === 'local' ? 'localStorage' : 'sessionStorage'] ?? null;
  }
}
