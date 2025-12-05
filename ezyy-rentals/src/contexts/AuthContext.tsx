import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { usersService } from '@/lib/services'
import type { User as AppUser } from '@/lib/types'

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']

interface AuthContextType {
  user: User | null
  session: Session
  appUser: AppUser | null
  loading: boolean
  signUp: (email: string, password: string, userData: Omit<AppUser, 'id' | 'created_at' | 'updated_at' | 'email'>) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshAppUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const hasSetLoadingRef = useRef(false)

  const loadAppUser = async (email: string) => {
    try {
      const { data, error } = await usersService.getByEmail(email)
      if (error) {
        console.error('Error loading app user:', error)
      }
      if (data) {
        setAppUser(data)
      }
    } catch (e) {
      console.error('Unexpected error loading app user:', e)
    }
  }

  const setLoadingOnce = () => {
    if (!hasSetLoadingRef.current) {
      hasSetLoadingRef.current = true
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Listen for auth changes - this fires immediately with current session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user?.email) {
          // Load app user in background - don't block on this
          loadAppUser(session.user.email).catch(e => {
            console.error('Error loading app user:', e)
          })
        } else {
          setAppUser(null)
        }
      } catch (e) {
        console.error('Error handling auth change:', e)
      } finally {
        // Only set loading to false once, on the first auth state change
        setLoadingOnce()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (
    email: string,
    password: string,
    userData: Omit<AppUser, 'id' | 'created_at' | 'updated_at' | 'email'>
  ) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      return { error: authError ?? new Error('Failed to create account') }
    }

    // Create user record in users table
    const { error: userError } = await usersService.create({
      ...userData,
      email,
    })

    if (userError) {
      // If user creation fails, we should clean up the auth user
      await supabase.auth.signOut()
      return { error: userError }
    }

    // Load the created user
    await loadAppUser(email)

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error) {
      await loadAppUser(email)
    }
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setAppUser(null)
  }

  const refreshAppUser = async () => {
    if (user?.email) {
      await loadAppUser(user.email)
    }
  }

  const value = {
    user,
    session,
    appUser,
    loading,
    signUp,
    signIn,
    signOut,
    refreshAppUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

