import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://qlcbepnhuevcagszvhql.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsY2JlcG5odWV2Y2Fnc3p2aHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjkwMzgsImV4cCI6MjA4MDQ0NTAzOH0.5D2t4-LUjLdUsJJubNtJllk7YAyGnRYvA5Ln9Fy4KfI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

