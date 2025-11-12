// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { networkInterfaces } from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('Foydalanuvchilarni boshqarish API hujjati')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({ 
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');

  // Log accessible URLs
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
    // Prefer the first non-internal IPv4
    const ip = addresses[0];
    const networkUrl = ip ? `http://${ip}:${port}/` : null;
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(`  ➜  Local:   ${localUrl}`);
    if (networkUrl) {
      // eslint-disable-next-line no-console
      console.log(`  ➜  Network: ${networkUrl}`);
    }
  } catch {}
}
bootstrap();
