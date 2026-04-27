const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

const onlineUsers = new Map() // socketId -> { userId, username, room }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-room', ({ roomId, userId, username }) => {
    socket.join(roomId)
    onlineUsers.set(socket.id, { userId, username, room: roomId })
    io.to(roomId).emit('user-joined', { userId, username })
    io.to(roomId).emit('online-count', getRoomCount(roomId))
  })

  socket.on('leave-room', ({ roomId }) => {
    socket.leave(roomId)
    const user = onlineUsers.get(socket.id)
    if (user) {
      io.to(roomId).emit('user-left', { userId: user.userId })
      io.to(roomId).emit('online-count', getRoomCount(roomId))
    }
  })

  socket.on('send-message', ({ roomId, message }) => {
    io.to(roomId).emit('new-message', message)
  })

  socket.on('typing-start', ({ roomId, username }) => {
    socket.to(roomId).emit('user-typing', { username })
  })

  socket.on('typing-stop', ({ roomId, username }) => {
    socket.to(roomId).emit('user-stopped-typing', { username })
  })

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id)
    if (user) {
      io.to(user.room).emit('user-left', { userId: user.userId })
      io.to(user.room).emit('online-count', getRoomCount(user.room))
      onlineUsers.delete(socket.id)
    }
    console.log('Client disconnected:', socket.id)
  })
})

function getRoomCount(roomId) {
  let count = 0
  for (const [, user] of onlineUsers) {
    if (user.room === roomId) count++
  }
  return count
}

app.get('/health', (_, res) => res.json({ status: 'ok', connections: onlineUsers.size }))

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Socket.io server running on port ${PORT}`))
