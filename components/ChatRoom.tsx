'use client'

import { useEffect, useState } from 'react'
import { initSocket, getSocket } from '@/lib/socket/client'

interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    username: string
    avatar?: string
  }
}

interface ChatRoomProps {
  roomId: string
  userId: string
  username: string
}

export default function ChatRoom({ roomId, userId, username }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState('')

  useEffect(() => {
    const socket = initSocket()

    // Join the socket room for real-time updates
    socket.emit('join_room', { roomId, userId })

    socket.on('previous_messages', (msgs: Message[]) => {
      setMessages(msgs)
    })

    socket.on('user_joined_room', () => {
      // Optionally refresh messages or show notification
    })

    socket.on('receive_message', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    socket.on('user_typing', ({ username }: { username: string }) => {
      setTypingUser(username)
      setIsTyping(true)
    })

    socket.on('user_stop_typing', () => {
      setIsTyping(false)
      setTypingUser('')
    })

    return () => {
      socket.off('previous_messages')
      socket.off('receive_message')
      socket.off('user_typing')
      socket.off('user_stop_typing')
      socket.off('user_joined_room')
    }
  }, [roomId, userId])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const socket = getSocket()
    socket.emit('send_message', {
      content: newMessage,
      userId,
      roomId,
    })

    setNewMessage('')
    socket.emit('stop_typing', { roomId })
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    const socket = getSocket()
    socket.emit('typing', { roomId, username })

    setTimeout(() => {
      socket.emit('stop_typing', { roomId })
    }, 1000)
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Chat Room</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.user.id === userId ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.user.id === userId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="text-sm font-semibold">{msg.user.username}</p>
              <p>{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="text-gray-500 text-sm italic">
            {typingUser} is typing...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
