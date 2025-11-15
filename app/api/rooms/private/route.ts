import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

interface PrivateRoomRequest {
  user1Id: string;
  user2Id: string;
}

export async function POST(request: Request) {
  try {
    const { user1Id, user2Id }: PrivateRoomRequest = await request.json();

    // Handle bot chat specially (no database needed)
    if (user1Id === 'bot_luna_1' || user2Id === 'bot_luna_1') {
      const botUserId = user2Id === 'bot_luna_1' ? user2Id : user1Id;
      const realUserId = user2Id === 'bot_luna_1' ? user1Id : user2Id;

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
      });
    }

    // Fetch all private rooms that include either user
    const allPrivateRooms = await prisma.room.findMany({
      where: {
        isPrivate: true,
        members: {
          some: {
            userId: { in: [user1Id, user2Id] },
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
    });

    type RoomType = typeof allPrivateRooms[number];

    // Check if a room already exists with exactly these two users
    const existingRoom = allPrivateRooms.find((room: RoomType) =>
      room.members.length === 2 &&
      room.members.every(m => [user1Id, user2Id].includes(m.userId))
    );

    if (existingRoom) return NextResponse.json(existingRoom);

    // Create new private room
    const newRoom = await prisma.room.create({
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
    });

    return NextResponse.json(newRoom);
  } catch (error) {
    console.error('Error creating private room:', error);
    return NextResponse.json(
      { error: 'Failed to create private room' },
      { status: 500 }
    );
  }
}
