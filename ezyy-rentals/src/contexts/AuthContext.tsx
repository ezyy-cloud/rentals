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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
    // Validate id_number is required and not empty
    if (!userData.id_number || userData.id_number.trim() === '') {
      return { error: new Error('ID Number is required and cannot be empty') }
    }

    // Normalize date_of_birth - ensure it's a valid date string (YYYY-MM-DD)
    const normalizeDate = (dateStr: string | undefined): string => {
      if (!dateStr || dateStr.trim() === '') {
        return new Date().toISOString().split('T')[0]
      }
      // If it includes time, extract just the date part
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0]
      }
      return dateStr
    }

    const dateOfBirth = normalizeDate(userData.date_of_birth)
    const idNumber = userData.id_number.trim() // Ensure no leading/trailing spaces

    // Pass user metadata to Supabase Auth so the trigger can use it
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          telephone: userData.telephone || '',
          address: userData.address || '',
          city: userData.city ?? null,
          country: userData.country ?? null,
          id_number: idNumber,
          date_of_birth: dateOfBirth,
          profile_picture: userData.profile_picture ?? null,
          next_of_kin_first_name: userData.next_of_kin_first_name || '',
          next_of_kin_last_name: userData.next_of_kin_last_name || '',
          next_of_kin_phone_number: userData.next_of_kin_phone_number || '',
        },
      },
    })

    if (authError || !authData.user) {
      return { error: authError ?? new Error('Failed to create account') }
    }

    // Wait for the session to be available (needed for RLS policies)
    // Try to get the session, with retries
    for (let i = 0; i < 5; i++) {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session) {
        break
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // The trigger should have created the user profile automatically
    // Wait a bit more for the trigger to complete, then check if user exists
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if user was created by trigger (with retries in case of timing issues)
    // Even if trigger failed or hasn't run, usersService.create will handle it robustly
    // using the updated create_user_profile RPC which handles conflicts gracefully
    
    // We try to create/update the user profile
    const { error: userError } = await usersService.create({
      ...userData,
      email,
      date_of_birth: dateOfBirth,
      // Ensure required fields are not empty
      telephone: userData.telephone || '',
      address: userData.address || '',
      id_number: idNumber,
      next_of_kin_first_name: userData.next_of_kin_first_name || '',
      next_of_kin_last_name: userData.next_of_kin_last_name || '',
      next_of_kin_phone_number: userData.next_of_kin_phone_number || '',
    })

    if (userError) {
      // Check for specific id_number conflict
      const isIdNumberConflict = userError.message?.toLowerCase().includes('id_number') || 
                                userError.message?.toLowerCase().includes('users_id_number_key')
      
      if (isIdNumberConflict) {
        await supabase.auth.signOut()
        return { error: new Error('This ID Number is already registered. Please use a different ID Number or contact support.') }
      }
      
      // Other errors
      await supabase.auth.signOut()
      return { error: userError }
    }

    // Load the created/updated user
    await loadAppUser(email)

    return { error: null }

    // Load the created/updated user
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

