import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // vitest 5 ya no excluye dist/ por defecto: sin esto, `npm run build`
    // deja .test.js compilados que se recolectan como tests duplicados.
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
})
