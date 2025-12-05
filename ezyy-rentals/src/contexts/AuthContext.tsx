import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user?.email) {
          await loadAppUser(session.user.email)
        }
      } catch (e) {
        console.error('Error loading initial session:', e)
      } finally {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user?.email) {
          await loadAppUser(session.user.email)
        } else {
          setAppUser(null)
        }
      } catch (e) {
        console.error('Error handling auth change:', e)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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

    // Wait a moment for any database triggers to complete
    if (authData.session) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create user record in users table
      // The RLS policy should allow this for authenticated users
      const { error: userError } = await usersService.create({
        ...userData,
        email,
      })

      if (userError) {
        // Check if user was created by trigger
        const { data: existingUser } = await usersService.getByEmail(email)
        if (existingUser) {
          // User exists (created by trigger), just load it
          await loadAppUser(email)
          return { error: null }
        }
        // User creation failed and user doesn't exist - clean up auth user
        await supabase.auth.signOut()
        return { error: userError }
      }

      // Load the created user
      await loadAppUser(email)
    }

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

