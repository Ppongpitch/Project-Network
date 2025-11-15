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

// Type definitions
type SocketUser = {
  id: string
  username: string
  email: string
  avatar?: string
}

type OnlineUser = {
  socketId: string
  username: string
  avatar?: string
}

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
  const onlineUsers = new Map<string, OnlineUser>()

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // User goes online
    socket.on('user_online', ({ userId, username, avatar }: { userId: string; username: string; avatar?: string }) => {
      onlineUsers.set(userId, { socketId: socket.id, username, avatar })
      io.emit(
        'online_users',
        Array.from(onlineUsers.entries()).map(([id, data]) => ({
          id,
          username: data.username,
          avatar: data.avatar,
        }))
      )
      console.log(`User ${username} is now online`)
    })

    // Join room
    socket.on('join_room', async ({ roomId, userId }: { roomId: string; userId: string }) => {
      socket.join(roomId)
      console.log(`User ${userId} connected to room ${roomId}`)

      const isBotRoom = roomId.includes('bot_luna_1')
      if (isBotRoom) {
        socket.emit('previous_messages', [])
        return
      }

      // Check if user is a member
      const isMember = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId } },
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
    socket.on('send_message', async ({ content, userId, roomId }: { content: string; userId: string; roomId: string }) => {
      try {
        // Prepare user data with type
        let userData: SocketUser = {
          id: userId,
          username: 'User',
          email: '',
          avatar: undefined,
        }

        // Bot handling
        if (userId === 'bot_luna_1') {
          userData = {
            id: 'bot_luna_1',
            username: 'Anya Bot',
            email: '',
            avatar: '/avatar1.jpg',
          }
        } else {
          // Fetch real user from database
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, email: true, avatar: true },
          })
          if (user) userData = user as SocketUser
        }

        const isBotRoom = roomId.includes('bot_luna_1')

        if (isBotRoom) {
          // Send virtual message for bot room
          const botMessage = {
            id: `temp_${Date.now()}_${Math.random()}`,
            content,
            roomId,
            userId,
            createdAt: new Date(),
            user: userData,
          }
          io.in(roomId).emit('receive_message', botMessage)
          console.log(`Bot message sent to room ${roomId}`)
          return
        }

        // Normal message for real rooms
        const message = await prisma.message.create({
          data: { content, userId, roomId },
          include: {
            user: { select: { id: true, username: true, email: true, avatar: true } },
          },
        })

        io.in(roomId).emit('receive_message', message)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Typing indicators
    socket.on('typing', ({ roomId, username }: { roomId: string; username: string }) => {
      socket.to(roomId).emit('user_typing', { username })
    })
    socket.on('stop_typing', ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit('user_stop_typing')
    })

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      for (const [userId, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) {
          onlineUsers.delete(userId)
          io.emit(
            'online_users',
            Array.from(onlineUsers.entries()).map(([id, data]) => ({
              id,
              username: data.username,
              avatar: data.avatar,
            }))
          )
          break
        }
      }
    })
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
