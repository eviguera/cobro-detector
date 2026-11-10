import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // vitest 5 dejo de excluir dist/ por defecto, y aqui conviven los tests
    // compilados con los fuentes. Solo corremos los fuentes.
    include: ['src/**/*.test.ts'],
  },
})
