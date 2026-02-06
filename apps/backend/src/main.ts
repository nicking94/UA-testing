import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Lista de orígenes permitidos
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const origins = frontendUrl.split(',').map(url => url.trim());
  
  // Añadimos versiones sin barra final por seguridad
  const cleanOrigins = origins.map(url => url.endsWith('/') ? url.slice(0, -1) : url);
  const allAllowedOrigins = [...new Set([...origins, ...cleanOrigins])];

  app.enableCors({
    origin: (origin, callback) => {
      // Si no hay origen (como peticiones locales o de servidor a servidor) permitimos
      if (!origin) return callback(null, true);
      
      const isAllowed = allAllowedOrigins.some(allowed => origin.startsWith(allowed));
      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Railway asigna automáticamente un PORT, debemos usarlo o por defecto 3001
  const port = process.env.PORT || 3001;
  // Escuchar en 0.0.0.0 es vital para Railway
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();