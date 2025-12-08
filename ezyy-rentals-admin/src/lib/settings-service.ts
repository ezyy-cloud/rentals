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

const SETTINGS_KEY = 'system_settings'
const DEFAULT_SETTINGS: SystemSettings = {
  company_name: 'Ezyy Rentals',
  email: 'info@ezyyrentals.com',
  notification_email: 'onboarding@resend.dev', // Default to Resend test email
  phone: '(555) 123-4567',
  website: 'www.ezyyrentals.com',
  address: '',
}

export const settingsService = {
  async getSettings(): Promise<{ data: SystemSettings | null; error: Error | null }> {
    try {
      // Try to get from Supabase first
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay, we'll use defaults
        console.warn('Error fetching settings from Supabase:', error)
      }

      if (data) {
        return { data, error: null }
      }

      // Fallback to localStorage
      const localSettings = localStorage.getItem(SETTINGS_KEY)
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings)
          return { data: parsed, error: null }
        } catch (parseError) {
          console.warn('Error parsing localStorage settings:', parseError)
        }
      }

      // Return defaults
      return { data: DEFAULT_SETTINGS, error: null }
    } catch (error) {
      console.error('Error getting settings:', error)
      // Fallback to localStorage
      const localSettings = localStorage.getItem(SETTINGS_KEY)
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings)
          return { data: parsed, error: null }
        } catch {
          // Return defaults
          return { data: DEFAULT_SETTINGS, error: null }
        }
      }
      return { data: DEFAULT_SETTINGS, error: null }
    }
  },

  async saveSettings(settings: Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: SystemSettings | null; error: Error | null }> {
    try {
      // Try to save to Supabase first
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .limit(1)
        .single()

      const settingsToSave = {
        ...settings,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('system_settings')
          .update(settingsToSave)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          throw error
        }

        // Also save to localStorage as backup
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
        return { data, error: null }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('system_settings')
          .insert({
            ...settingsToSave,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Also save to localStorage as backup
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
        return { data, error: null }
      }
    } catch (error) {
      console.error('Error saving settings to Supabase, using localStorage:', error)
      // Fallback to localStorage
      const settingsToSave: SystemSettings = {
        ...settings,
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave))
      return { data: settingsToSave, error: null }
    }
  },
}

