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
  roomName: string
}

export default function ChatRoom({ roomId, userId, username, roomName }: ChatRoomProps) {
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
    <div className="flex flex-col h-screen relative"
         style={{
           background: 'linear-gradient(180deg, #FFF9E6 0%, #FFE5F0 50%, #FFD4E5 100%)'
         }}>
      {/* Header Banner */}
      <div className="py-6 px-4 text-center relative z-10">
        <div className="inline-block bg-pink-200 px-8 py-3 rounded-full border-4 border-pink-300 shadow-lg">
          <h1 className="text-2xl font-bold text-pink-500 tracking-wider"
              style={{ textShadow: '2px 2px 0px rgba(255, 255, 255, 0.8)' }}>
            {roomName}
          </h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
        {messages.map((msg) => {
          const messageTime = new Date(msg.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.user.id === userId ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {msg.user.avatar ? (
                  <img
                    src={msg.user.avatar}
                    alt={msg.user.username}
                    className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white">
                    {msg.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col ${
                msg.user.id === userId ? 'items-end' : 'items-start'
              }`}>
                <div className="flex items-baseline gap-2 mb-1 px-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {msg.user.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {messageTime}
                  </span>
                </div>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md relative ${
                    msg.user.id === userId
                      ? 'bg-yellow-100 text-gray-800 border-2 border-yellow-300'
                      : 'bg-blue-100 text-gray-800 border-2 border-blue-200'
                  }`}
                  style={{
                    borderRadius: msg.user.id === userId ? '20px 20px 5px 20px' : '20px 20px 20px 5px'
                  }}
                >
                  <p className="text-base">{msg.content}</p>
                </div>
              </div>
            </div>
          )
        })}
        
        {isTyping && (
          <div className="text-gray-500 text-sm italic pl-14">
            {typingUser} is typing...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t-4 border-pink-200">
        <div className="flex gap-3 items-center max-w-2xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 px-6 py-3 border-3 border-gray-300 rounded-full focus:outline-none focus:ring-4 focus:ring-pink-300 text-gray-700 placeholder-gray-400 bg-gray-50"
          />
          <button
            type="submit"
            className="px-8 py-3 text-white font-bold rounded-full border-3 border-white shadow-lg transition-all transform hover:scale-105"
            style={{ 
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            ⭐
          </button>
        </div>
      </form>
    </div>
  )
}
