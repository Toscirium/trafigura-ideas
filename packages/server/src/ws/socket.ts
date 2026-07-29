import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { AuthUser } from 'shared';
import { verifyToken } from '../domain/auth.js';

declare module 'socket.io' {
  interface Socket {
    user: AuthUser;
  }
}

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      next(new Error('unauthorized'));
      return;
    }
    socket.user = user;
    next();
  });

  return io;
}
