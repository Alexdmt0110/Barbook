import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { DEFAULT_RATE_LIMIT } from '../common/rate-limit.config';
import {
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
} from '../common/rate-limit.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('Auth rate limiting', () => {
  let app: INestApplication | undefined;

  let authService: {
    login: jest.Mock;
    register: jest.Mock;
    getCurrentUser: jest.Mock;
  };

  const user = {
    id: 'user-123',
    email: 'alex@barbook.local',
    displayName: 'Alex',
  };

  const authResponse = {
    user,
    accessToken: 'test-access-token',
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue(authResponse),
      register: jest.fn().mockResolvedValue(authResponse),
      getCurrentUser: jest.fn().mockResolvedValue(user),
    };

    const testingModuleBuilder = Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([DEFAULT_RATE_LIMIT])],

      controllers: [AuthController],

      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },

        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    });

    testingModuleBuilder.overrideGuard(JwtAuthGuard).useValue({
      canActivate: () => true,
    });

    const moduleFixture: TestingModule = await testingModuleBuilder.compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    app = undefined;
  });

  it('limits repeated login requests', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized.');
    }

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.limit; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'alex@barbook.local',
          password: 'une phrase de passe suffisamment longue',
        })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'alex@barbook.local',
        password: 'une phrase de passe suffisamment longue',
      })
      .expect(429);

    expect(authService.login).toHaveBeenCalledTimes(LOGIN_RATE_LIMIT.limit);
  });

  it('limits repeated registration requests', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized.');
    }

    for (let attempt = 0; attempt < REGISTER_RATE_LIMIT.limit; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          displayName: 'Alex',
          email: 'alex@barbook.local',
          password: 'une phrase de passe suffisamment longue',
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        displayName: 'Alex',
        email: 'alex@barbook.local',
        password: 'une phrase de passe suffisamment longue',
      })
      .expect(429);

    expect(authService.register).toHaveBeenCalledTimes(
      REGISTER_RATE_LIMIT.limit,
    );
  });
});
