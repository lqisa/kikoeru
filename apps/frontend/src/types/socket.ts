import type { Socket } from 'socket.io-client';

export type ScanLog = {
  message: string;
  level: string;
};

export type ScanTask = {
  rjcode: number;
  logs: ScanLog[];
};

export type ScanResult = {
  rjcode: number;
  result: 'added' | 'updated' | 'failed';
  count: number;
};

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
  SCAN_INIT_STATE: (payload: {
    mainLogs: ScanLog[];
    tasks: ScanTask[];
    failedTasks: ScanTask[];
    results: ScanResult[];
  }) => void;
  SCAN_ERROR: () => void;
  SCAN_PROGRESS: (payload: { current: number; total: number }) => void;
  SCAN_TASKS: (payload: { tasks: ScanTask[] }) => void;
  SCAN_FAILED_TASKS: (payload: { failedTasks: ScanTask[] }) => void;
  SCAN_RESULTS: (payload: { results: ScanResult[] }) => void;
  SCAN_MAIN_LOGS: (payload: { mainLogs: ScanLog[] }) => void;
  SCAN_FINISHED: (payload: { message: string }) => void;
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
  registerEvent: <T = unknown>(event: string, handler: (arg: T) => void) => void;
  setAuthToken: (token: string) => void;
  open: () => void;
  close: () => void;
  emit: <T = unknown>(event: string, ...args: T[]) => void;
  isConnected: () => boolean;
};