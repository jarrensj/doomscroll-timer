import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface DateEntry {
  id?: string
  user_id: string
  date: string // YYYY-MM-DD format
  total_time_ms: number
  created_at?: string
  updated_at?: string
}
