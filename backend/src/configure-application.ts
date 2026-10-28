import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolveWebSessionConfig } from './auth/sessions/web-session-security';

/** Shared by the real server and integration tests so HTTP validation cannot drift. */
export function configureApplication(app: NestExpressApplication): void {
  // Production requires exactly one reverse proxy and a non-public API listener.
  app.set('trust proxy', 1);

  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  const web = resolveWebSessionConfig(
    config.getOrThrow<string>('FRONTEND_ORIGIN'),
    config.get<string>('NODE_ENV', 'development'),
  );
  app.enableCors({ origin: web.origin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
