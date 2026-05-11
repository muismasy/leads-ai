import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import type { JwtPayload } from '@leadsai/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Setup Socket.IO with JWT authentication and tenant-scoped rooms.
 */
export function setupSocketIO(io: SocketIOServer) {
  // --- Redis Pub/Sub for cross-service events ---
  redisSub.subscribe('socket_broadcast');
  redisSub.on('message', (channel, message) => {
    if (channel === 'socket_broadcast') {
      try {
        const { target, targetId, event, data } = JSON.parse(message);
        // target: 'tenant' | 'conversation' | 'agent'
        if (target === 'tenant') {
          io.to(`tenant:${targetId}`).emit(event, data);
        } else if (target === 'conversation') {
          io.to(`conversation:${targetId}`).emit(event, data);
        } else if (target === 'agent') {
          io.to(`agent:${targetId}`).emit(event, data);
        }
      } catch (err) {
        console.error('[Socket] Redis broadcast error:', err);
      }
    }
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    console.log(`[Socket] Agent connected: ${user.email} (tenant: ${user.tenantId})`);

    socket.join(`tenant:${user.tenantId}`);
    socket.join(`agent:${user.userId}`);

    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('agent:typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('agent:typing', {
        agentId: user.userId,
        agentName: user.email,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Agent disconnected: ${user.email}`);
    });
  });

  console.log('[Socket] Socket.IO initialized with Redis Pub/Sub');
}

export function emitToTenant(io: SocketIOServer, tenantId: string, event: string, data: any) {
  io.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToConversation(io: SocketIOServer, conversationId: string, event: string, data: any) {
  io.to(`conversation:${conversationId}`).emit(event, data);
}
