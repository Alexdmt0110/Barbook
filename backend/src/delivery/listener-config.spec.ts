import { resolveListener } from './listener-config';

describe('release listener', () => {
  it('defaults to loopback and accepts explicit IPv4/IPv6', () => {
    expect(resolveListener(undefined, undefined)).toEqual({
      host: '127.0.0.1',
      port: 3000,
    });
    expect(resolveListener('::1', '3001')).toEqual({ host: '::1', port: 3001 });
    expect(resolveListener('0.0.0.0', '80').host).toBe('0.0.0.0');
  });
  it('rejects hostnames, empty/hostile hosts and invalid ports', () => {
    for (const host of ['', 'localhost', 'https://127.0.0.1', '127.0.0.1:3000'])
      expect(() => resolveListener(host, '3000')).toThrow();
    for (const port of ['', '0', '65536', 'abc', '1.5'])
      expect(() => resolveListener('127.0.0.1', port)).toThrow();
  });
});
