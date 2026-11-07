import { isIP } from 'node:net';

export function resolveListener(
  host: string | undefined,
  port: string | undefined,
) {
  const address = host ?? '127.0.0.1';
  if (!isIP(address))
    throw new Error('LISTEN_HOST must be a literal IP address.');
  const number = Number(port ?? '3000');
  if (!Number.isInteger(number) || number < 1 || number > 65535)
    throw new Error('PORT must be a valid TCP port.');
  return { host: address, port: number };
}
