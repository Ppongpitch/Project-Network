import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const initSocket = () => {
  if (!socket) {
    const url = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}` // .host includes port
      : 'http://localhost:3000'
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.')
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
