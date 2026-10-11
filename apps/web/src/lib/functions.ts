import { supabase } from './supabase'

/** Appelle une Edge Function avec le jeton de la personne connectée. */
export async function callFunction(name: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
}
