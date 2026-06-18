import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [
      'http://localhost:8100',
      'http://localhost:4200',
      'http://localhost:3000',
      'https://nextstep-ai-mobile.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>('port') || 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  logger.log('🚀 NextStep AI API Started');
  logger.log(`📦 Environment: ${nodeEnv}`);
  logger.log(`🌐 Port: ${port}`);
  logger.log(`🔗 Base URL: http://localhost:${port}/api/v1`);
  logger.log('🍃 MongoDB Connected');
}

bootstrap();