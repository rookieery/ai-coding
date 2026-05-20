/**
 * Socket.io 客户端服务层
 * 提供单例 Socket 连接管理，支持自动重连
 */
import { io, Socket } from 'socket.io-client';
import { config } from '../config';

type EventCallback = (...args: unknown[]) => void;

interface SocketService {
  connect(token: string): void;
  disconnect(): void;
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
  emit(event: string, data?: unknown): void;
  readonly isConnected: boolean;
  readonly socket: Socket | null;
}

function createSocketService(): SocketService {
  let socket: Socket | null = null;

  return {
    connect(token: string): void {
      if (socket?.connected) {
        return;
      }

      const url = config.socket.url || undefined;

      socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    },

    disconnect(): void {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    },

    on(event: string, callback: EventCallback): void {
      socket?.on(event, callback);
    },

    off(event: string, callback: EventCallback): void {
      socket?.off(event, callback);
    },

    emit(event: string, data?: unknown): void {
      socket?.emit(event, data);
    },

    get isConnected(): boolean {
      return socket?.connected ?? false;
    },

    get socket(): Socket | null {
      return socket;
    },
  };
}

export const socketService: SocketService = createSocketService();
