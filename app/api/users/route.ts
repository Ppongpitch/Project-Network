import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function POST(request: Request) {
  try {
    const { id, username, email } = await request.json()
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (existingUser) {
      return NextResponse.json(existingUser)
    }

    // Create new user with Supabase Auth ID
    const user = await prisma.user.create({
      data: {
        id,
        username,
        email,
      },
    })
    
    return NextResponse.json(user)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
