require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const emailRoutes = require('./emailRoutes')

const app = express()
app.use(cors())
app.use(express.json())

// ── Email API Routes ──────────────────────────────────────────
app.use('/api/email', emailRoutes)

// ── Multer Configuration ──────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.params.type || 'general'
    const dir = path.join(uploadsDir, subDir)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
  ]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Use: jpg, png, webp, gif, mp4, webm`), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 3,
  },
})

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir))

// ── File Upload Routes ────────────────────────────────────────

// Single file upload (for reports)
app.post('/api/upload/:type', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.params.type}/${req.file.filename}`
    res.json({
      success: true,
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

// Multiple file upload (for reports with multiple attachments)
app.post('/api/upload-multiple/:type', upload.array('files', 3), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }
    const files = req.files.map(file => ({
      url: `${req.protocol}://${req.get('host')}/uploads/${req.params.type}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }))
    res.json({ success: true, files })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

// Delete uploaded file
app.delete('/api/upload/:type/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.type, req.params.filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      res.json({ success: true })
    } else {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (err) {
    console.error('Delete error:', err)
    res.status(500).json({ error: 'Delete failed' })
  }
})

// ── Multer Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum 50MB allowed.' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 3 files allowed.' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err) {
    return res.status(400).json({ error: err.message })
  }
  next()
})

// ── Socket.IO ─────────────────────────────────────────────────
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

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  connections: onlineUsers.size,
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}))

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`InfraNaut server running on port ${PORT}`))
