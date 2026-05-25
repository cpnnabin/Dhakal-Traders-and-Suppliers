import { io, Socket } from 'socket.io-client';

const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

// create a singleton socket
export const socket: Socket = io(SERVER, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function connectWithToken(token?: string) {
  try {
    if (token) {
      socket.auth = { token } as any;
    }
    if (!socket.connected) socket.connect();
  } catch (e) {}
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

export function joinRoom(role: string) {
  try {
    if (!role) return;
    socket.emit('join', `role:${role}`);
  } catch (e) {}
}

export default socket;
