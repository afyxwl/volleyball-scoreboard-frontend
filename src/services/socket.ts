import { io } from 'socket.io-client'

export function createSocket() {
  return io(import.meta.env.VITE_WS_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
}