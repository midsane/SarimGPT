// lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// This client is for use in Client Components in the App Router
export const supabase = createClientComponentClient()