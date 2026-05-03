// IMPORTANT: Initialize Sentry as early as possible.
import './instrument';

// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { networkInterfaces } from 'os';
import { json, urlencoded } from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('Foydalanuvchilarni boshqarish API hujjati')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use(json({ limit: '2000mb' }));
  app.use(urlencoded({ extended: true, limit: '2000mb' }));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://zippy.travel-map.uz',
      'https://alikafecrmm.uz',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  try {
    const nets = networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
    const localUrl = `http://localhost:${port}/`;
    const ip = addresses[0];
    const networkUrl = ip ? `http://${ip}:${port}/` : null;
    if (networkUrl) {
    }
  } catch { }
}

// Start the app.
bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
