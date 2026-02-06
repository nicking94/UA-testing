import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const origins = frontendUrl.split(',').map(url => url.trim());
  
  // Limpiamos las URLs de barras finales
  const cleanOrigins = origins.map(url => url.endsWith('/') ? url.slice(0, -1) : url);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir si no hay origen (como herramientas de test)
      if (!origin) return callback(null, true);
      
      // Permitir si está en nuestra lista de FRONTEND_URL o es un subdominio de Vercel
      const isAllowed = cleanOrigins.some(allowed => origin.startsWith(allowed));
      const isVercel = origin.endsWith('.vercel.app');
      
      if (isAllowed || isVercel) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for: ${origin}`);
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

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();