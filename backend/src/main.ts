import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApplication } from './configure-application';

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
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  const port = resolvePort(configService.get<string>('PORT'));

  configureApplication(app);

  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start Barbook API:', error);

  process.exit(1);
});
