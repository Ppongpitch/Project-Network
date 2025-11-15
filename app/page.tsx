'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import ChatRoom from '@/components/ChatRoom'

interface Room {
  id: string
  name: string
  isPrivate: boolean
  members: Array<{
    user: {
      id: string
      username: string
      email: string
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
}

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [showUserList, setShowUserList] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchRooms()
      
      // Initialize socket and set user online
      import('@/lib/socket/client').then(({ initSocket }) => {
        const socket = initSocket()
        socket.emit('user_online', { 
          userId: user.id, 
          username: user.user_metadata.username || user.email 
        })
        
        socket.on('online_users', (users: OnlineUser[]) => {
          setOnlineUsers(users)
        })
        
        return () => {
          socket.off('online_users')
        }
      })
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
        body: JSON.stringify({ name: newRoomName }),
      })
      
      if (res.ok) {
        setNewRoomName('')
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
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
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
          className="absolute top-4 left-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          ← Back to Rooms
        </button>
        <ChatRoom 
          roomId={selectedRoom} 
          userId={user.id} 
          username={user.user_metadata.username || user.email || 'User'} 
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Chat Rooms</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Online ({onlineUsers.length})
            </button>
            <span className="text-gray-600">
              {user.user_metadata.username || user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {showUserList && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Online Users</h2>
            <div className="space-y-2">
              {onlineUsers.filter(u => u.id !== user.id).map((onlineUser) => (
                <div key={onlineUser.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{onlineUser.username}</span>
                  <button
                    onClick={() => handleStartPrivateChat(onlineUser.id)}
                    className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    Message
                  </button>
                </div>
              ))}
              {onlineUsers.filter(u => u.id !== user.id).length === 0 && (
                <p className="text-gray-500 text-center py-4">No other users online</p>
              )}
            </div>
          </div>
        )}
        
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
          <form onSubmit={handleCreateRoom} className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => {
            const isMember = isRoomMember(room)
            const otherUser = room.isPrivate ? getOtherUserInPrivateRoom(room) : null
            
            return (
              <div
                key={room.id}
                className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      {room.isPrivate ? `${otherUser?.username || 'Private Chat'}` : room.name}
                    </h3>
                    {!room.isPrivate && (
                      <div className="text-sm text-gray-500 mb-2">
                        <p className="font-medium">Members:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {room.members.slice(0, 5).map(m => (
                            <span key={m.user.id} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {m.user.username}
                            </span>
                          ))}
                          {room.members.length > 5 && (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              +{room.members.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-gray-600 text-sm">
                      {room._count.members} members · {room._count.messages} messages
                    </p>
                  </div>
                  {room.isPrivate && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Private
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  {isMember ? (
                    <button
                      onClick={() => setSelectedRoom(room.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Open Chat
                    </button>
                  ) : (
                    <>
                      {!room.isPrivate && (
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Join Room
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
