import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isProfileComplete } from '@/lib/profile-utils'

interface ProfileCompletionGuardProps {
  children: React.ReactNode
}

/**
 * Guard component that redirects to profile page if user's profile is incomplete
 * Allows access to profile page itself and public routes
 */
export function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const { appUser, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Don't redirect if still loading
    if (loading) {
      return
    }

    // Allow access to profile page and public routes
    const publicRoutes = ['/', '/device', '/cart', '/login', '/signup']
    const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route))
    
    if (isPublicRoute || location.pathname === '/profile') {
      return
    }

    // If user exists but profile is incomplete, redirect to profile
    if (appUser && !isProfileComplete(appUser)) {
      navigate('/profile', { replace: true })
    }
  }, [appUser, loading, navigate, location.pathname])

  // If profile is incomplete and we're not on profile page or public route, show loading
  // (redirect will happen in useEffect)
  const publicRoutes = ['/', '/device', '/cart', '/login', '/signup']
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route))
  
  if (appUser && !isProfileComplete(appUser) && location.pathname !== '/profile' && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}

