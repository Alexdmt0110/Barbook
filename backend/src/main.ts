import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function resolvePort(value: string | undefined): number {
  const port = Number(value ?? '3000');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return port;
}

/**
 * Démarre l'API Barbook.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = resolvePort(configService.get<string>('PORT'));
  const frontendOrigin = configService.getOrThrow<string>('FRONTEND_ORIGIN');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: frontendOrigin,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start Barbook API:', error);
  process.exit(1);
});
