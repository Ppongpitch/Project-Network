import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function POST(request: Request) {
  try {
    const { user1Id, user2Id } = await request.json()

    // 🤖 Handle bot chat specially (no database needed)
    if (user2Id === 'bot_luna_1' || user1Id === 'bot_luna_1') {
      const botUserId = user2Id === 'bot_luna_1' ? user2Id : user1Id
      const realUserId = user2Id === 'bot_luna_1' ? user1Id : user2Id
      
      // Return a virtual room ID for bot chat
      return NextResponse.json({
        id: `private_${realUserId}_bot_luna_1`,
        name: 'Luna Bot',
        isPrivate: true,
        members: [
          {
            user: {
              id: realUserId,
              username: 'You',
              email: ''
            }
          },
          {
            user: {
              id: 'bot_luna_1',
              username: 'Luna Bot',
              email: ''
            }
          }
        ],
        _count: {
          members: 2,
          messages: 0
        }
      })
    }

    // Check if a private room already exists between these two users
    const allPrivateRooms = await prisma.room.findMany({
      where: {
        isPrivate: true,
        members: {
          some: {
            userId: {
              in: [user1Id, user2Id],
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Find room with exactly these two users
    const existingRoom = allPrivateRooms.find(room => 
      room.members.length === 2 &&
      room.members.every(m => [user1Id, user2Id].includes(m.userId))
    )

    if (existingRoom) {
      return NextResponse.json(existingRoom)
    }

    // Create new private room
    const room = await prisma.room.create({
      data: {
        name: 'Private Chat',
        isPrivate: true,
        members: {
          create: [
            { userId: user1Id },
            { userId: user2Id },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Error creating private room:', error)
    return NextResponse.json({ error: 'Failed to create private room' }, { status: 500 })
  }
}