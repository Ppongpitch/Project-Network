import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
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
          select: { members: true, messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    
    return NextResponse.json(rooms)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    
    const room = await prisma.room.create({
      data: { name },
    })
    
    return NextResponse.json(room)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
