import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { buildPostgresConnectionString } from './postgres-connection-string';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const connectionString = buildPostgresConnectionString({
      user: configService.getOrThrow<string>('POSTGRES_USER'),
      password: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
      host: configService.getOrThrow<string>('DATABASE_HOST'),
      port: configService.getOrThrow<string>('DATABASE_PORT'),
      database: configService.getOrThrow<string>('POSTGRES_DB'),
    });

    const adapter = new PrismaPg({ connectionString });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
