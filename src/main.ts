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

      // Android Capacitor APK origins
      'https://localhost',
      'http://localhost',
      'capacitor://localhost',
      'ionic://localhost',

      // Vercel frontend
      'https://nextstep-ai-mobile.vercel.app',
      'https://nextstep-ai-mobile-git-prod-saifk05s-projects.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const configService = app.get(ConfigService);

  const port =
    configService.get<number>('PORT') ||
    configService.get<number>('port') ||
    3000;

  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  await app.listen(port, '0.0.0.0');

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  const baseUrl =
    nodeEnv === 'production'
      ? 'https://nextstep-ai-backend-mtbs.onrender.com/api/v1'
      : `http://localhost:${port}/api/v1`;

  logger.log('🚀 NextStep AI API Started');
  logger.log(`📦 Environment: ${nodeEnv}`);
  logger.log(`🌐 Port: ${port}`);
  logger.log(`🔗 Base URL: ${baseUrl}`);
}

bootstrap();
