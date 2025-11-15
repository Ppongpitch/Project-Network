import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function POST(request: Request) {
  try {
    const { user1Id, user2Id } = await request.json()

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
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Error creating private room:', error)
    return NextResponse.json({ error: 'Failed to create private room' }, { status: 500 })
  }
}
