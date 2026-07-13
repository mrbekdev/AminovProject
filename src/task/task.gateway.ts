import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*'} })
export class TaskGateway {
  @WebSocketServer()
  server: Server;

  emitUpdated(payload: any = null) {
    try {
      console.log('TaskGateway: Emitting "tasks.updated" to clients with payload:', payload);
      this.server.emit('tasks.updated', payload ?? { ts: Date.now() });
    } catch (err) {
      console.error('TaskGateway error during emit:', err);
    }
  }
}
