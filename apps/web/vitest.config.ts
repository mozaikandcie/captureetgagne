import { defineConfig } from 'vitest/config'

// `npm test` : tests unitaires rapides. Les tests des règles d'accès (RLS) et de bout en bout parlent à Supabase :
// ils se lancent à part (`npm run test:rls`, `npm run test:e2e`).
export default defineConfig({
  test: { exclude: ['node_modules/**', 'dist/**', 'tests/rls/**', 'e2e/**'] },
})
