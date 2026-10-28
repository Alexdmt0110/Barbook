import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { configureApplication } from './configure-application';
import { PrismaService } from './database/prisma.service';

describe('Application module graph', () => {
  it('resolves real controllers and session guards without connecting to a database', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          FRONTEND_ORIGIN: 'http://localhost:4200',
          NODE_ENV: 'test',
        }),
      )
      .compile();
    const app = module.createNestApplication<NestExpressApplication<Server>>({
      logger: false,
    });
    configureApplication(app);
    try {
      await app.init();
      await request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
      // No cookie must fail before a query, across all feature modules.
      for (const url of [
        '/api/cocktails',
        '/api/folders',
        '/api/ingredients?query=Gin',
      ]) {
        await request(app.getHttpServer()).get(url).expect(401);
      }
    } finally {
      await app.close();
    }
  });
});
