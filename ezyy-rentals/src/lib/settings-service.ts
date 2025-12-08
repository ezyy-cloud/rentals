import { supabase } from './supabase'

export interface SystemSettings {
  id?: string
  company_name: string
  email: string // Company contact email and email where booking notifications are sent
  notification_email?: string // Email used as "from" address in Resend (must be verified in Resend)
  phone: string
  website: string
  address?: string
  created_at?: string
  updated_at?: string
}

export const settingsService = {
  async getSettings(): Promise<{ data: SystemSettings | null; error: Error | null }> {
    try {
      // Get from Supabase
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay
        console.warn('Error fetching settings from Supabase:', error)
      }

      if (data) {
        return { data, error: null }
      }

      // Return null if no settings found
      return { data: null, error: null }
    } catch (error) {
      console.error('Error getting settings:', error)
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') }
    }
  },
}

