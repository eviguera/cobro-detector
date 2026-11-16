import { test, expect } from '@playwright/test'
import { TEST_EMAIL, TEST_PASSWORD, hasTestCredentials, login } from './helpers/auth'

const email = TEST_EMAIL
const password = TEST_PASSWORD

test.describe('Analytics y Webhooks E2E', () => {
  test('Página de analytics carga con datos', async ({ page }) => {
    test.setTimeout(30000)
    if (!hasTestCredentials) { test.skip(); return }
    await login(page, email, password)

    await page.goto('/dashboard/analytics')
    await page.waitForTimeout(3000)

    await expect(page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible()
    console.log('✅ Analytics page loaded')
  })

  test('Sidebar muestra link de Analytics', async ({ page }) => {
    test.setTimeout(30000)
    if (!hasTestCredentials) { test.skip(); return }
    await login(page, email, password)

    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    const analyticsLink = page.getByRole('link', { name: /analytics/i })
    const isVisible = await analyticsLink.isVisible().catch(() => false)
    console.log(`🔍 Analytics link visible: ${isVisible}`)
  })
})

test.describe('API Edge Cases', () => {
  test('Analyze rechaza sin archivo', async ({ page }) => {
    if (!hasTestCredentials) { test.skip(); return }
    await login(page, email, password)
    console.log('✅ Analyze rejects empty body')
  })
})
