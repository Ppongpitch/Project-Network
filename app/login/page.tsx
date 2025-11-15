'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FloatingIcon {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  src: string
  size: number
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const { signIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Initialize floating icons
    const icons: FloatingIcon[] = [
      { id: 1, x: 100, y: 100, vx: 1.5, vy: 1, src: '/Peanuts.svg', size: 60 },
      { id: 2, x: 300, y: 200, vx: -1, vy: 1.2, src: '/Peanuts.svg', size: 50 },
      { id: 3, x: 500, y: 150, vx: 1.2, vy: -0.8, src: '/chimera_plush.svg', size: 80 },
      { id: 4, x: 700, y: 300, vx: -1.3, vy: -1, src: '/anya.svg', size: 90 },
      { id: 5, x: 200, y: 400, vx: 0.9, vy: -1.1, src: '/Peanuts.svg', size: 45 },
      { id: 6, x: 600, y: 450, vx: -1.1, vy: 0.9, src: '/anya.svg', size: 85 },
      { id: 7, x: 400, y: 350, vx: 1.4, vy: -1.2, src: '/chimera_plush.svg', size: 75 },
    ]
    setFloatingIcons(icons)

    const animate = () => {
      setFloatingIcons(prevIcons => 
        prevIcons.map(icon => {
          let { x, y, vx, vy } = icon
          const windowWidth = window.innerWidth
          const windowHeight = window.innerHeight

          // Update position
          x += vx
          y += vy

          // Bounce off edges
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" 
         style={{
           background: 'linear-gradient(180deg, #B8E6F5 0%, #FFF9E6 35%, #FFE5F0 70%, #FFD4E5 100%)'
         }}>
      {/* Floating icons */}
      {floatingIcons.map(icon => (
        <div
          key={icon.id}
          className="absolute pointer-events-none transition-none"
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
            className="w-full h-full object-contain opacity-70"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}
          />
        </div>
      ))}
      
      {/* Small dots */}
      <div className="absolute top-12 left-32 w-3 h-3 rounded-full bg-pink-300 opacity-60"></div>
      <div className="absolute top-40 right-40 w-4 h-4 rounded-full bg-pink-200 opacity-50"></div>
      <div className="absolute bottom-32 left-48 w-3 h-3 rounded-full bg-pink-300 opacity-60"></div>
      <div className="absolute bottom-60 right-32 w-5 h-5 rounded-full bg-pink-200 opacity-50"></div>
      <div className="absolute top-1/3 left-20 w-4 h-4 rounded-full border-2 border-pink-300 opacity-50"></div>
      <div className="absolute top-1/4 right-24 w-6 h-6 rounded-full border-2 border-pink-200 opacity-40"></div>
      <div className="absolute bottom-1/3 right-52 w-4 h-4 rounded-full border-2 border-pink-300 opacity-50"></div>
      
      {/* Sparkle */}
      <div className="absolute bottom-32 right-24 text-2xl opacity-60">✨</div>

      {/* Header Banner */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-pink-200 px-12 py-3 rounded-full border-4 border-pink-300 shadow-lg">
          <h1 className="text-3xl font-bold text-pink-500 tracking-wider" 
              style={{ textShadow: '2px 2px 0px rgba(255, 255, 255, 0.8)' }}>
            PEANUT CHAT! 🥜
          </h1>
        </div>
      </div>

      {/* Main Form Container - Blue Rectangle */}
      <div className="relative flex items-center justify-center w-full px-4" style={{ minHeight: '70vh' }}>
        <div className="relative p-8 rounded-3xl shadow-2xl"
             style={{
               background: 'linear-gradient(135deg, #AFE2EE 0%, #9DD9E8 100%)',
               maxWidth: '450px',
               width: '100%'
             }}>
          
          <div className="w-full">
            {/* Login Title */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white tracking-wider"
                  style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)' }}>
                🔑 LOGIN! 🔑
              </h2>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-200 text-red-700 rounded-lg text-sm text-center border-2 border-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 rounded-full border-3 border-gray-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-pink-300 text-center text-sm"
                required
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 rounded-full border-3 border-gray-300 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-pink-300 text-center text-sm"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2.5 bg-pink-400 text-white font-bold text-base rounded-full border-4 border-white shadow-lg hover:bg-pink-500 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ textShadow: '2px 2px 0px rgba(0, 0, 0, 0.2)' }}
              >
                🔑 {loading ? 'LOGGING IN...' : 'GO LOGIN!'} 🔑
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-white font-medium">
              Don't have an account?{' '}
              <Link href="/register" className="text-pink-600 hover:text-pink-700 font-bold underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
