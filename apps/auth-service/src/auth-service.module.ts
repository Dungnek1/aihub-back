import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthServiceController } from './controller/auth-service.controller';
import { AuthServiceService } from './services/auth-service.service';
import { RabbitMQModule } from '@app/rabbitmq';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AUTH_CLIENT, AUTH_QUEUE } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION
          ? parseInt(process.env.JWT_EXPIRATION)
          : 3600,
      },
    }),
    PassportModule,
    SharedModule,
    RedisModule,
    DatabaseModule,
    RabbitMQModule.registerRmq(AUTH_CLIENT, AUTH_QUEUE),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService, JwtStrategy],
})
export class AuthServiceModule { }
