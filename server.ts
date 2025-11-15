import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { prisma } from './lib/prisma/client'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true)
    await handle(req, res, parsedUrl)
  })

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Track online users
  const onlineUsers = new Map<string, { socketId: string; username: string }>()

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // User goes online
    socket.on('user_online', ({ userId, username }) => {
      onlineUsers.set(userId, { socketId: socket.id, username })
      io.emit('online_users', Array.from(onlineUsers.entries()).map(([id, data]) => ({ 
        id, 
        username: data.username 
      })))
      console.log(`User ${username} is now online`)
    })

    // Join room (socket connection only, not database membership)
    socket.on('join_room', async ({ roomId, userId }) => {
      socket.join(roomId)
      console.log(`User ${userId} connected to room ${roomId}`)
      
      // Load previous messages (only if user is a member)
      const isMember = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      })
      
      if (isMember) {
        const messages = await prisma.message.findMany({
          where: { roomId },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
          take: 50,
        })
        
        socket.emit('previous_messages', messages)
      }
    })

    // Send message
    socket.on('send_message', async ({ content, userId, roomId }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content,
            userId,
            roomId,
          },
          include: {
            user: true,
          },
        })

        io.to(roomId).emit('receive_message', message)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Typing indicator
    socket.on('typing', ({ roomId, username }) => {
      socket.to(roomId).emit('user_typing', { username })
    })

    socket.on('stop_typing', ({ roomId }) => {
      socket.to(roomId).emit('user_stop_typing')
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      
      // Remove user from online list
      for (const [userId, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) {
          onlineUsers.delete(userId)
          io.emit('online_users', Array.from(onlineUsers.entries()).map(([id, data]) => ({ 
            id, 
            username: data.username 
          })))
          break
        }
      }
    })
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
