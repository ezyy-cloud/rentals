import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { usersService } from '@/lib/services'
import type { User as AppUser } from '@/lib/types'
import { isProfileComplete } from '@/lib/profile-utils'

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
  const hasCheckedProfileCompletion = useRef(false)

  const loadAppUser = async (email: string) => {
    try {
      // Add timeout to prevent hanging (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading user')), 5000)
      })
      
      const userPromise = usersService.getByEmail(email)
      const result = await Promise.race([userPromise, timeoutPromise])
      
      if (result && 'data' in result) {
        const { data } = result
        if (data) {
          setAppUser(data)
        } else {
          setAppUser(null)
        }
      }
    } catch (error) {
      console.error('Error loading app user:', error)
      // Don't set appUser to null on timeout - keep existing value if any
      // This prevents clearing the user state on slow network
      if (error instanceof Error && error.message !== 'Timeout loading user') {
        setAppUser(null)
      }
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
      } catch (error) {
        console.error('Error loading initial session:', error)
      } finally {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session)
        setUser(session?.user ?? null)
        
        // Reset the flag when user signs out
        if (event === 'SIGNED_OUT') {
          hasCheckedProfileCompletion.current = false
          setAppUser(null)
        } else if (session?.user?.email) {
          await loadAppUser(session.user.email)
          // Only check profile completion on actual sign-in events, not on every auth state change
          // This prevents infinite redirect loops on page reload
          // Also only check once per session to avoid repeated checks
          if (event === 'SIGNED_IN' && !hasCheckedProfileCompletion.current) {
            hasCheckedProfileCompletion.current = true
            try {
              const { data: userData } = await usersService.getByEmail(session.user.email)
              if (userData && !isProfileComplete(userData)) {
                // Store flag to indicate this is a new user who needs to complete profile
                // ProfileCompletionGuard will handle the redirect using React Router
                sessionStorage.setItem('needs_profile_completion', 'true')
                // Don't use window.location.href here - it causes full page reloads
                // ProfileCompletionGuard will handle the redirect properly
              }
            } catch (error) {
              console.error('Error checking profile completion:', error)
            }
          }
        } else {
          setAppUser(null)
        }
      } catch (error) {
        console.error('Error in auth state change:', error)
        setAppUser(null)
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
    // Note: loadAppUser will be called by onAuthStateChange listener
    // We don't need to call it here to avoid duplicate calls
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

