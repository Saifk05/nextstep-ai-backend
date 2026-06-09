import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);

  const port = configService.get<number>('port') || 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  logger.log('🚀 NextStep AI API Started');
  logger.log(`📦 Environment: ${nodeEnv}`);
  logger.log(`🌐 Port: ${port}`);
  logger.log('🍃 MongoDB Connected');
}

bootstrap();