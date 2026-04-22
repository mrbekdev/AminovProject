// IMPORTANT: Initialize Sentry as early as possible.
import './instrument';

// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { networkInterfaces } from 'os';
import { json, urlencoded } from 'express';

// Attempt to initialize LogRocket server SDK (optional).
let LogRocket: any = undefined;
try {
  // Use require so missing package doesn't break the app at build time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LogRocket = require('@logrocket/node');
  const LR_APP = process.env.LOGROCKET_APP ?? '3xogei/aminov';
  if (LogRocket && typeof LogRocket.init === 'function') {
    try {
      LogRocket.init(LR_APP);
      // Safe capture hooks
      process.on('uncaughtException', (err: any) => {
        console.error('uncaughtException', err);
        try { LogRocket.captureException?.(err); } catch {}
      });
      process.on('unhandledRejection', (reason: any) => {
        console.error('unhandledRejection', reason);
        try { LogRocket.captureException?.(reason); } catch {}
      });
      console.log('LogRocket initialized:', LR_APP);
    } catch (initErr) {
      console.warn('LogRocket init failed:', initErr?.message ?? initErr);
      LogRocket = undefined;
    }
  }
} catch (e) {
  console.warn('LogRocket not available:', e?.message ?? e);
  LogRocket = undefined;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('Foydalanuvchilarni boshqarish API hujjati')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({ 
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
  } catch {}
}

// Start the app and capture bootstrap errors to LogRocket if available.
bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  try { LogRocket?.captureException?.(err); } catch {}
  process.exit(1);
});
