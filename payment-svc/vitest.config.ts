import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // vitest 5 ya no excluye `dist/` por defecto: si `npm run build` deja
    // tests compilados ahí, se ejecutarían duplicados. Restringimos a la fuente.
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
})
