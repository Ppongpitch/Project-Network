import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await request.json()
    const { roomId } = await params

    // Check if already a member
    const existing = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ message: 'Already a member' })
    }

    // Add user to room
    await prisma.roomMember.create({
      data: {
        userId,
        roomId,
      },
    })

    return NextResponse.json({ message: 'Joined room successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}
