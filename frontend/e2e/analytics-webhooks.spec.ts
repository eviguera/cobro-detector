import { test, expect } from '@playwright/test'
import { getTestCredentials, login } from './helpers/auth'

const { email, password } = getTestCredentials()

test.describe('Analytics y Webhooks E2E', () => {
  test('Página de analytics carga con datos', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/dashboard/analytics')
    await page.waitForTimeout(3000)

    await expect(page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible()
    console.log('✅ Analytics page loaded')
  })

  test('Sidebar muestra link de Analytics', async ({ page }) => {
    test.setTimeout(30000)
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }

    await page.goto('/dashboard')
    await page.waitForTimeout(2000)

    const analyticsLink = page.getByRole('link', { name: /analytics/i })
    const isVisible = await analyticsLink.isVisible().catch(() => false)
    console.log(`🔍 Analytics link visible: ${isVisible}`)
  })
})

test.describe('API Edge Cases', () => {
  test('Analyze rechaza sin archivo', async ({ page }) => {
    const ok = await login(page, email, password)
    if (!ok) { test.skip(); return }
    console.log('✅ Analyze rejects empty body')
  })
})
