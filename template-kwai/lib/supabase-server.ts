import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

function createLazyClient(): SupabaseClient {
  let client: SupabaseClient | null = null

  const handler: ProxyHandler<SupabaseClient> = {
    get(_target, prop) {
      if (!client) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error("Supabase env vars not configured")
        }
        client = createClient(supabaseUrl, supabaseServiceKey)
      }
      const val = (client as any)[prop]
      if (typeof val === "function") {
        return val.bind(client)
      }
      return val
    },
  }

  return new Proxy({} as SupabaseClient, handler)
}

export const supabaseAdmin = createLazyClient()
