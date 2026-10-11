import { createClient } from '@supabase/supabase-js'

// Publishable (public) credentials. Access is enforced by row-level security in the database.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q'

export const supabase = createClient(url, key)

export const BUCKET = 'taarucha-media'
export const T = {
  exhibitions: 'taarucha_exhibitions',
  works: 'taarucha_works',
  settings: 'taarucha_settings',
  admins: 'taarucha_admins',
}
