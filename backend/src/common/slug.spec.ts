import { toSlug } from './slug';

describe('toSlug', () => {
  it('creates a lowercase hyphenated slug', () => {
    expect(toSlug('Espresso Martini')).toBe('espresso-martini');
  });

  it('removes diacritics', () => {
    expect(toSlug('Crème brûlée')).toBe('creme-brulee');
  });

  it('normalizes punctuation and spaces', () => {
    expect(toSlug("  L'Île Verte & Café  ")).toBe('l-ile-verte-cafe');
  });

  it('returns an empty slug when no usable character exists', () => {
    expect(toSlug('--- !!! ---')).toBe('');
  });
});
