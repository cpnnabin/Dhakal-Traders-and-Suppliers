import { useEffect } from 'react';
import socket, { connectSocket, disconnectSocket } from './socket';

// Hook to connect socket and register handlers
export function useSocket(handlers: { [event: string]: (...args: any[]) => void } = {}) {
  useEffect(() => {
    connectSocket();

    Object.entries(handlers).forEach(([evt, fn]) => {
      socket.on(evt, fn as any);
    });

    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => {
        socket.off(evt, fn as any);
      });
      // do not disconnect globally on unmount; leave lifecycle to caller
      // disconnectSocket();
    };
  }, []);
}

export default useSocket;
