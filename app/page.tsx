'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import ChatRoom from '@/components/ChatRoom'

interface FloatingIcon {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  src: string
  size: number
}

interface Room {
  id: string
  name: string
  isPrivate: boolean
  members: Array<{
    user: {
      id: string
      username: string
      email: string
      avatar?: string
    }
  }>
  _count: {
    members: number
    messages: number
  }
}

interface OnlineUser {
  id: string
  username: string
  avatar?: string
}

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [showUserList, setShowUserList] = useState(false)
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([])
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Initialize floating icons
    const icons: FloatingIcon[] = [
      { id: 1, x: 80, y: 80, vx: 1.2, vy: 0.8, src: '/Peanuts.svg', size: 50 },
      { id: 2, x: 250, y: 150, vx: -0.9, vy: 1, src: '/chimera_plush.svg', size: 70 },
      { id: 3, x: 450, y: 100, vx: 1, vy: -0.7, src: '/anya.svg', size: 80 },
      { id: 4, x: 150, y: 350, vx: 0.8, vy: -0.9, src: '/Peanuts.svg', size: 40 },
    ]
    setFloatingIcons(icons)

    const animate = () => {
      setFloatingIcons(prevIcons => 
        prevIcons.map(icon => {
          let { x, y, vx, vy } = icon
          const windowWidth = window.innerWidth
          const windowHeight = window.innerHeight

          x += vx
          y += vy

          if (x <= 0 || x >= windowWidth - icon.size) {
            vx = -vx
            x = x <= 0 ? 0 : windowWidth - icon.size
          }
          if (y <= 0 || y >= windowHeight - icon.size) {
            vy = -vy
            y = y <= 0 ? 0 : windowHeight - icon.size
          }

          return { ...icon, x, y, vx, vy }
        })
      )
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchRooms()
      
      // Initialize socket and set user online
      import('@/lib/socket/client').then(({ initSocket }) => {
        const socket = initSocket()
        socket.emit('user_online', { 
          userId: user.id, 
          username: user.user_metadata.username || user.email,
          avatar: user.user_metadata.avatar
        })
        
        socket.on('online_users', (users: OnlineUser[]) => {
          console.log('Received online users:', users)
          setOnlineUsers(users)
        })
      })
      
      return () => {
        import('@/lib/socket/client').then(({ initSocket }) => {
          const socket = initSocket()
          socket.off('online_users')
        })
      }
    }
  }, [user])

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      setRooms(data)
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, userId: user!.id }),
      })
      
      if (res.ok) {
        const newRoom = await res.json()
        setNewRoomName('')
        setSelectedRoom(newRoom.id)
        fetchRooms()
      }
    } catch (error) {
      console.error('Error creating room:', error)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    try {
      await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id }),
      })
      fetchRooms()
    } catch (error) {
      console.error('Error joining room:', error)
    }
  }

  const handleStartPrivateChat = async (otherUserId: string) => {
    try {
      const res = await fetch('/api/rooms/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1Id: user!.id, user2Id: otherUserId }),
      })
      const room = await res.json()
      setSelectedRoom(room.id)
      setShowUserList(false)
    } catch (error) {
      console.error('Error starting private chat:', error)
    }
  }

  const isRoomMember = (room: Room) => {
    return room.members.some(m => m.user.id === user?.id)
  }

  const getOtherUserInPrivateRoom = (room: Room) => {
    return room.members.find(m => m.user.id !== user?.id)?.user
  }

  const handleSignOut = async () => {
    try {
      // Disconnect socket before signing out
      const { initSocket } = await import('@/lib/socket/client')
      const socket = initSocket()
      socket.disconnect()
      
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Still try to sign out even if socket disconnect fails
      await signOut()
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" 
           style={{
             background: 'linear-gradient(180deg, #B8E6F5 0%, #FFF9E6 35%, #FFE5F0 70%, #FFD4E5 100%)'
           }}>
        <div className="text-xl font-bold text-pink-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (selectedRoom) {
    return (
      <div>
        <button
          onClick={() => setSelectedRoom(null)}
          className="absolute top-4 left-4 px-4 py-2 bg-pink-400 text-white font-bold rounded-full border-4 border-white shadow-lg hover:bg-pink-500 transition-all transform hover:scale-105 z-50"
          style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' }}
        >
          ← Back
        </button>
        <ChatRoom 
          roomId={selectedRoom} 
          userId={user.id} 
          username={user.user_metadata.username || user.email || 'User'}
          roomName={rooms.find(r => r.id === selectedRoom)?.name || 'Chat Room'}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden" 
         style={{
           background: 'linear-gradient(180deg, #B8E6F5 0%, #FFF9E6 35%, #FFE5F0 70%, #FFD4E5 100%)'
         }}>
      {/* Floating icons */}
      {floatingIcons.map(icon => (
        <div
          key={icon.id}
          className="absolute pointer-events-none transition-none z-0"
          style={{
            left: `${icon.x}px`,
            top: `${icon.y}px`,
            width: `${icon.size}px`,
            height: `${icon.size}px`,
          }}
        >
          <img 
            src={icon.src} 
            alt="floating icon" 
            className="w-full h-full object-contain opacity-60"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}
          />
        </div>
      ))}

      {/* Decorative dots */}
      <div className="absolute top-20 right-32 w-4 h-4 rounded-full bg-pink-300 opacity-50 z-0"></div>
      <div className="absolute bottom-40 left-40 w-3 h-3 rounded-full bg-pink-200 opacity-50 z-0"></div>
      <div className="absolute top-1/3 right-20 w-5 h-5 rounded-full border-2 border-pink-300 opacity-40 z-0"></div>

      {/* Header Banner */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-pink-200 px-10 py-3 rounded-full border-4 border-pink-300 shadow-lg">
          <h1 className="text-2xl font-bold text-pink-500 tracking-wider" 
              style={{ textShadow: '2px 2px 0px rgba(255, 255, 255, 0.8)' }}>
            PEANUT CHAT! 🥜
          </h1>
        </div>
      </div>

      {/* User controls - top right */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        <div className="px-4 py-2 bg-white text-gray-700 font-medium text-sm rounded-full border-3 border-pink-300 shadow-lg">
          👋 {user.user_metadata.username || user.email}
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-400 text-white font-bold text-sm rounded-full border-3 border-white shadow-lg hover:bg-red-500 transition-all transform hover:scale-105"
          style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' }}
        >
          Sign Out
        </button>
      </div>

      <div className="relative z-10 pt-24 px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6">

            {/* Left sidebar - Online Users */}
            <div className="w-72 bg-white rounded-2xl border-3 border-gray-800 shadow-lg p-4" 
                 style={{ height: 'calc(100vh - 160px)' }}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <h2 className="text-lg font-bold text-gray-700">Online Users</h2>
              </div>
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
                {/* Current user */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 border-2 border-pink-200">
                  {user.user_metadata.avatar ? (
                    <img
                      src={user.user_metadata.avatar}
                      alt={user.user_metadata.username || user.email}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-white shadow">
                      {(user.user_metadata.username || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-sm truncate">
                        {user.user_metadata.username || user.email} (You)
                      </p>
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    </div>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>

                {/* Other online users */}
                {onlineUsers.filter(u => u.id !== user.id).map((onlineUser) => (
                  <div
                    key={onlineUser.id}
                    onClick={() => handleStartPrivateChat(onlineUser.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-pink-50 hover:shadow-md"
                  >
                    {onlineUser.avatar ? (
                      <img
                        src={onlineUser.avatar}
                        alt={onlineUser.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center text-white font-bold border-2 border-white shadow">
                        {onlineUser.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {onlineUser.username}
                        </p>
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
                      <p className="text-xs text-gray-500">Click to message</p>
                    </div>
                    <div className="text-pink-400">
                      💬
                    </div>
                  </div>
                ))}

                {onlineUsers.filter(u => u.id !== user.id).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No other users online</p>
                    <p className="text-gray-300 text-xs mt-2">Invite friends to chat! 🥜</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right content area */}
            <div className="flex-1 space-y-4">
              {/* Create New Room */}
              <div className="bg-white rounded-2xl border-3 border-gray-300 shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Create New Room</h2>
                <form onSubmit={handleCreateRoom} className="flex gap-2">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name..."
                    className="flex-1 px-4 py-2.5 rounded-full border-3 border-gray-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-pink-300 text-center text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-500 text-white font-bold text-sm rounded-full border-3 border-white shadow-lg hover:bg-blue-600 transition-all transform hover:scale-105"
                    style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' }}
                  >
                    Create
                  </button>
                </form>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.filter(room => !room.isPrivate).map((room) => {
                  const isMember = isRoomMember(room)
                  
                  return (
                    <div
                      key={room.id}
                      className="p-5 bg-white rounded-2xl border-3 border-gray-300 shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">
                              {room.name}
                            </h3>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            <p className="font-semibold mb-1">Members:</p>
                            <div className="flex flex-wrap gap-1">
                              {room.members.slice(0, 3).map(m => (
                                <span key={m.user.id} className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs">
                                  {m.user.username}
                                </span>
                              ))}
                              {room.members.length > 3 && (
                                <span 
                                  className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs cursor-help relative group"
                                  title={room.members.slice(3).map(m => m.user.username).join(', ')}
                                >
                                  +{room.members.length - 3}
                                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                                    <div className="max-w-xs">
                                      {room.members.slice(3).map(m => m.user.username).join(', ')}
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                      <div className="border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-500 text-xs">
                            {room._count.members} members · {room._count.messages} messages
                          </p>
                        </div>
                        {room.members.length > 0 && (
                          <div 
                            className="flex -space-x-2 cursor-help relative group"
                            title={room.members.map(m => m.user.username).join(', ')}
                          >
                            <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                              <div className="max-w-xs">
                                <div className="font-semibold mb-1">All Members ({room.members.length}):</div>
                                {room.members.map(m => m.user.username).join(', ')}
                              </div>
                              <div className="absolute top-full right-4 transform -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                            {room.members.slice(0, 2).map((m, i) => (
                              <div key={m.user.id} 
                                   className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden"
                                   title={m.user.username}>
                                {m.user.avatar ? (
                                  <img
                                    src={m.user.avatar}
                                    alt={m.user.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                                    {m.user.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        {isMember ? (
                          <button
                            onClick={() => setSelectedRoom(room.id)}
                            className="flex-1 px-4 py-2 text-white font-bold text-sm rounded-full border-3 border-white shadow hover:opacity-90 transition-all transform hover:scale-105"
                            style={{ 
                              background: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)',
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' 
                            }}
                          >
                            Open Chat
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinRoom(room.id)}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white font-bold text-sm rounded-full border-3 border-white shadow hover:bg-blue-600 transition-all transform hover:scale-105"
                            style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' }}
                          >
                            Join Room
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
