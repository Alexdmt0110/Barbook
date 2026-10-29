import { InventoryModule } from './inventory/inventory.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CocktailsModule } from './cocktails/cocktails.module';
import { DEFAULT_RATE_LIMIT } from './common/rate-limit.config';
import { PrismaModule } from './database/prisma.module';
import { IngredientsModule } from './ingredients/ingredients.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),

    ThrottlerModule.forRoot([DEFAULT_RATE_LIMIT]),

    PrismaModule,
    AuthModule,
    CocktailsModule,
    IngredientsModule,
    InventoryModule,
    WorkspacesModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
