import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolveListener } from './delivery/listener-config';
import { frontendDelivery } from './delivery/frontend-delivery';
import { AppModule } from './app.module';
import { configureApplication } from './configure-application';

/**
 * Démarre l'API Barbook.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  const listener = resolveListener(
    configService.get<string>('LISTEN_HOST'),
    configService.get<string>('PORT'),
  );

  configureApplication(app);

  const frontend = configService.get<string>('FRONTEND_DIST_DIR');
  if (frontend !== undefined) app.use(frontendDelivery(frontend));

  await app.listen(listener.port, listener.host);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start Barbook API:', error);

  process.exit(1);
});
