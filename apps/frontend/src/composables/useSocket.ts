import { readonly, onUnmounted, shallowRef } from 'vue';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { SocketState, SocketManager } from '../types/socket';

const state = shallowRef<SocketState>({
  connected: false,
  socket: null,
});

let socketManagerCreated = false;

export function createSocketManager() {
  console.log('createSocketManager called, socketManagerCreated:', socketManagerCreated);
  if (socketManagerCreated) return;
  socketManagerCreated = true;

  const initialToken =
    typeof localStorage !== 'undefined' ? localStorage.getItem('jwt-token') || '' : '';

  console.log('Creating Socket.IO instance with token:', initialToken ? 'present' : 'missing');
  const socket: Socket = io('', {
    autoConnect: false,
    auth: {
      token: initialToken,
    },
  });

  console.log('Socket instance created, adding event listeners...');
  socket.on('connect', () => {
    console.log('Socket connected event triggered!');
    state.value.connected = true;
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected event triggered!');
    state.value.connected = false;
  });

  socket.on('connect_error', (error: any) => {
    console.error('Socket connection error:', error);
  });

  state.value.socket = socket;
  console.log('Socket instance stored in state');
}

export function useSocket(): SocketManager {
  const registerEvent = <T = unknown>(event: string, handler: (...args: T[]) => void) => {
    const socket = state.value.socket;
    if (!socket) return;

    socket.on(event, handler);

    onUnmounted(() => {
      socket.off(event, handler);
    });
  };

  const setAuthToken = (token: string) => {
    const socket = state.value.socket;
    if (socket) {
      socket.auth = { token };
      if (socket.connected) {
        socket.disconnect();
        socket.connect();
      }
    }
  };

  const open = () => {
    const socket = state.value.socket;
    if (socket && !socket.connected) {
      socket.connect();
    }
  };

  const close = () => {
    const socket = state.value.socket;
    if (socket) {
      socket.disconnect();
    }
  };

  const emit = <T = unknown>(event: string, ...args: T[]) => {
    const socket = state.value.socket;
    if (socket) {
      socket.emit(event, ...args);
    }
  };

  const isConnected = () => {
    return state.value.connected;
  };

  return {
    socket: readonly(state) as SocketManager['socket'],
    registerEvent,
    setAuthToken,
    open,
    close,
    emit,
    isConnected,
  };
}
