import type { Socket } from 'socket.io-client';

export type SocketEventType =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'play'
  | 'pause'
  | 'stop'
  | 'seek'
  | 'volume'
  | 'progress'
  | 'queue'
  | 'metadata';

export type SocketEventHandler<T = unknown> = (...args: T[]) => void;

export type SocketEvents = {
  connect: () => void;
  disconnect: () => void;
  error: (error: Error | string) => void;
  success: (payload: {
    message: string;
    auth: boolean;
    user: { name: string; group: string };
  }) => void;
  scan: (payload: unknown) => void;
  SCAN_INIT_STATE: () => void;
  SCAN_ERROR: () => void;
  SCAN_PROGRESS: (payload: { current: number; total: number }) => void;
  play: (data: { workId: number; trackId?: string }) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  volume: (volume: number) => void;
  progress: (data: { currentTime: number; duration: number }) => void;
  queue: (queue: unknown[]) => void;
  metadata: (metadata: unknown) => void;
};

export type SocketState = {
  connected: boolean;
  socket: Socket | null;
};

export type SocketManager = {
  socket: Readonly<{ value: SocketState }>;
  registerEvent: <T extends string>(event: T, handler: (...args: unknown[]) => void) => void;
  setAuthToken: (token: string) => void;
  open: () => void;
  close: () => void;
  emit: <T = unknown>(event: string, ...args: T[]) => void;
  isConnected: () => boolean;
};
