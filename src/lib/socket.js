import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

let socket = null
let usingSocketIO = false

export function initSocket(onFallback) {
  if (!SOCKET_URL) {
    console.warn('No SOCKET_URL set, using Supabase Realtime fallback')
    onFallback?.()
    return null
  }

  socket = io(SOCKET_URL, {
    timeout: 3000,
    transports: ['websocket'],
  })

  const timeoutId = setTimeout(() => {
    if (!socket.connected) {
      console.warn('Socket.io timeout, switching to Supabase Realtime')
      socket.disconnect()
      socket = null
      onFallback?.()
    }
  }, 3000)

  socket.on('connect', () => {
    clearTimeout(timeoutId)
    usingSocketIO = true
    console.log('Socket.io connected')
  })

  socket.on('disconnect', () => {
    usingSocketIO = false
  })

  return socket
}

export function getSocket() { return socket }
export function isSocketIO() { return usingSocketIO }

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  usingSocketIO = false
}
