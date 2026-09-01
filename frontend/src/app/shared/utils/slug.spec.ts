import { describe, expect, it } from 'vitest';
import { toSlug } from './slug';

describe('toSlug', () => {
  it('normalizes a simple ingredient name', () => {
    expect(toSlug('Gin')).toBe('gin');
  });

  it('removes accents', () => {
    expect(toSlug('Crème de pêche')).toBe('creme-de-peche');
  });

  it('normalizes spaces and punctuation', () => {
    expect(toSlug('  Jus de citron vert !!!  ')).toBe('jus-de-citron-vert');
  });

  it('returns an empty slug when no letter or digit remains', () => {
    expect(toSlug('--- !!! ---')).toBe('');
  });
});
