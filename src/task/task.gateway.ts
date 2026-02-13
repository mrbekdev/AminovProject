import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*'} })
export class TaskGateway {
  @WebSocketServer()
  server: Server;

  emitUpdated(payload: any = null) {
    try {
      this.server.emit('tasks.updated', payload ?? { ts: Date.now() });
    } catch {}
  }
}
