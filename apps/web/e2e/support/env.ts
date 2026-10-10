import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Lit `.env` (variables VITE_*) sans dépendance : les tests utilisent le même projet Supabase que l'application. */
function readDotEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(resolve(root, '.env'), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    )
  } catch {
    return {}
  }
}

const file = readDotEnv()
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? file.VITE_SUPABASE_URL ?? ''
export const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? file.VITE_SUPABASE_ANON_KEY ?? ''
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
export const AUTH_DIR = resolve(root, 'e2e/.auth')

/** Événement d'exemple (seed.sql) : sert de modèle pour fabriquer les événements de test. */
export const MAIN_EVENT = '11111111-1111-1111-1111-111111111111'

/** Numéros de test déclarés dans Supabase (Authentication > Phone > Test numbers). Code : 123456. */
export const PHONES = {
  organizer: '+33600000001',
  juror1: '+33600000002',
  juror2: '+33600000003',
  participantA: '+33600000011',
  participantB: '+33600000012',
} as const
export const OTP = '123456'
export const nationalFormat = (e164: string) => '0' + e164.slice(3) // +33600000011 → 0600000011

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis (apps/web/.env)')
