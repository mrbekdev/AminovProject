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

  // Global Unrestricted CORS Middleware
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    exposedHeaders: '*',
  });

  app.use(json({ limit: '2000mb' }));
  app.use(urlencoded({ extended: true, limit: '2000mb' }));

  const express = require('express');
  const path = require('path');
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
