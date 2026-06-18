import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — safe to use in client components
export const supabase = createClient(url, anonKey)

// Server client with service role — only import server-side
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}
