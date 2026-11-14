import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const localURL = `http://localhost:${PORT}`;
const baseURL = process.env.E2E_URL || localURL;
// Solo levantamos el dev server cuando apuntamos a local. Si E2E_URL apunta a
// un entorno ya desplegado, Playwright no debe intentar arrancar nada.
const isLocalTarget = baseURL === localURL || baseURL === `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Arranca Next.js por su cuenta (local y CI). Elimina el arranque manual +
  // loop de espera que vivía en ci.yml: una sola fuente de verdad y el mismo
  // entorno en los dos sitios. En local reutiliza el dev server ya levantado.
  webServer: isLocalTarget
    ? {
        command: `npm run dev -- -p ${PORT}`,
        url: localURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
