import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserStorageArea, BrowserStorageService } from './browser-storage.service';

describe('BrowserStorageService failure boundaries', () => {
  const fixture = () => ({
    getItem: vi.fn(() => 'stored'), setItem: vi.fn(), removeItem: vi.fn(),
  });
  let local: ReturnType<typeof fixture>;
  let session: ReturnType<typeof fixture>;
  let view: { localStorage: typeof local; sessionStorage: typeof session };
  let document: { defaultView: typeof view | null };
  let service: BrowserStorageService;
  beforeEach(() => {
    local = fixture();
    session = fixture();
    view = { localStorage: local, sessionStorage: session };
    document = { defaultView: view };
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: document }] });
    service = TestBed.inject(BrowserStorageService);
  });
  it.each<BrowserStorageArea>(['local', 'session'])(
    'accesses only the chosen %s area and key', (area) => {
      const selected = area === 'local' ? local : session;
      const other = area === 'local' ? session : local;
      expect(service.read(area, 'owned')).toBe('stored');
      expect(service.write(area, 'owned', 'value')).toBe(true);
      expect(service.remove(area, 'owned')).toBe(true);
      expect(selected.getItem).toHaveBeenCalledExactlyOnceWith('owned');
      expect(selected.setItem).toHaveBeenCalledExactlyOnceWith('owned', 'value');
      expect(selected.removeItem).toHaveBeenCalledExactlyOnceWith('owned');
      expect(other.getItem).not.toHaveBeenCalled();
      expect(other.setItem).not.toHaveBeenCalled();
      expect(other.removeItem).not.toHaveBeenCalled();
    },
  );
  it.each<BrowserStorageArea>(['local', 'session'])(
    'handles a forbidden %s storage getter before any method is called', (area) => {
      Object.defineProperty(view, area === 'local' ? 'localStorage' : 'sessionStorage', {
        get: () => { throw new DOMException('Blocked', 'SecurityError'); },
      });
      expect(service.read(area, 'owned')).toBeNull();
      expect(service.write(area, 'owned', 'value')).toBe(false);
      expect(service.remove(area, 'owned')).toBe(false);
      for (const storage of [local, session]) {
        expect(storage.getItem).not.toHaveBeenCalled();
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(storage.removeItem).not.toHaveBeenCalled();
      }
    },
  );
  it.each<BrowserStorageArea>(['local', 'session'])(
    'handles %s method failures and quota exhaustion without throwing', (area) => {
      const selected = area === 'local' ? local : session;
      selected.getItem.mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
      selected.setItem.mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
      selected.removeItem.mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
      expect(service.read(area, 'owned')).toBeNull();
      expect(service.write(area, 'owned', 'value')).toBe(false);
      expect(service.remove(area, 'owned')).toBe(false);
    },
  );
  it('returns controlled failures without a browser window', () => {
    document.defaultView = null;
    for (const area of ['local', 'session'] as const) {
      expect(service.read(area, 'owned')).toBeNull();
      expect(service.write(area, 'owned', 'value')).toBe(false);
      expect(service.remove(area, 'owned')).toBe(false);
    }
  });
});
