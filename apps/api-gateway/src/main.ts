import { loadEnvFile } from '@app/shared';
import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { TransformInterceptor } from './interceptors';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';

// Load environment variables before NestJS starts
loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayModule);
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);
  
  // Enable trust proxy to properly read x-forwarded headers
  app.set('trust proxy', true);
  
  // Increase body size limit for large content (e.g., blog posts with images)
  // This handles JSON body size limit
  app.use(express.json({ limit: '50mb' }));
  // Only parse urlencoded for non-multipart requests
  app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
    } else {
      next();
    }
  });
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Add request logging middleware
  app.use((req: any, res: any, next: any) => {
    console.log(`[API Gateway] ${req.method} ${req.url}`, {
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'none',
        'content-type': req.headers['content-type'],
      },
      body: req.method === 'POST' || req.method === 'PUT' ? '***' : undefined,
    });
    next();
  });

  // Setup Socket.IO adapter for WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter - catch tất cả errors
  app.useGlobalFilters(new AllExceptionsFilter());


  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1']
  });
  
  // Apply JWT guard AFTER setting up prefix and versioning
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor(reflector));


  app.useStaticAssets(join(process.cwd(), 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');

  // Setup Swagger Documentation
  const port = Number(config.get('API_GATEWAY_PORT')) || Number(process.env.PORT) || 9000;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Hub API')
    .setDescription(
      'API Gateway for AI Hub Microservices\n\n' +
      'This is the main entry point for all client requests. ' +
      'All requests are routed to appropriate microservices via RabbitMQ.',
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'Local Development')
    .addServer('https://api-dashboard.aihubvietnam.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Auth Service endpoints')
    .addTag('Blog', 'Blog Service endpoints')
    .addTag('Notifications', 'Notification Service endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: false,
    },
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(port);
  console.log(`✅ API Gateway is running on port ${port}`);
  console.log(
    `📚 Swagger documentation available at http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
