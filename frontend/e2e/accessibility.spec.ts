import { test, expect, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Gate de accesibilidad (axe-core) para las rutas públicas.
 *
 * Reglas: WCAG 2.0 / 2.1 / 2.2 niveles A y AA.
 * Criterio de fallo: severidad `critical` y `serious`.
 *
 * Allowlist
 * ---------
 * Hay violaciones `serious` que son preexistentes y no se pueden corregir desde
 * este territorio (viven en `frontend/src/**`, que está fuera de alcance para
 * la tarea 4.3). Se listan aquí por ruta + regla, con su razón, y se emiten
 * como warning en el log. Cualquier violación `critical`/`serious` que NO esté
 * en la allowlist falla el test.
 *
 * Para forzar el gate estricto (sin allowlist) en local:
 *   A11Y_NO_ALLOWLIST=1 npx playwright test e2e/accessibility.spec.ts
 */

type AxeViolation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]

const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
]

/** Severidades que bloquean el merge. */
const BLOCKING_IMPACTS = new Set(['critical', 'serious'])

interface AllowlistEntry {
  rule: string
  reason: string
}

const ALLOWLIST: Record<string, AllowlistEntry[]> = {
  '/': [
    {
      rule: 'color-contrast',
      reason:
        'Hero stats de la landing (`.text-muted-foreground/80` en frontend/src/app/page.tsx) ' +
        'quedan en 3.96:1 vs 4.5:1 requerido. Preexistente y fuera del territorio de tests; ' +
        'se corrige en una tarea de frontend. Pendiente: ver TODO de a11y en el informe.',
    },
  ],
}

function allowedRules(route: string): Set<string> {
  const bypass = process.env.A11Y_NO_ALLOWLIST === '1'
  if (bypass) return new Set()
  return new Set((ALLOWLIST[route] ?? []).map((entry) => entry.rule))
}

function formatViolations(violations: AxeViolation[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 5)
        .map((node) => `      - ${node.target.join(' ')}`)
        .join('\n')
      const more =
        violation.nodes.length > 5
          ? `\n      ... y ${violation.nodes.length - 5} nodo(s) más`
          : ''
      return [
        `  [${violation.impact}] ${violation.id}: ${violation.help}`,
        `    ${violation.helpUrl}`,
        nodes + more,
      ].join('\n')
    })
    .join('\n\n')
}

/**
 * Espera a que la página esté realmente pintada antes de medir:
 * heading visible (señal de la app, no de la red) + fuentes cargadas
 * (el color-contrast depende de las métricas finales del texto).
 */
async function waitForPaint(page: Page, readySelector: () => ReturnType<Page['locator']>) {
  await expect(readySelector()).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

async function runAxe(page: Page, route: string, scope?: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  if (scope) builder = builder.include(scope)
  return builder.analyze()
}

async function assertAccessible(
  page: Page,
  testInfo: TestInfo,
  route: string,
  results: Awaited<ReturnType<AxeBuilder['analyze']>>
) {
  // Artefacto completo: se adjunta siempre para poder inspeccionarlo sin
  // reproducir el fallo en local.
  await testInfo.attach(`axe-${route.replace(/[^a-z0-9]+/gi, '-')}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  })

  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.has(violation.impact ?? '')
  )
  const allowed = allowedRules(route)
  const disallowed = blocking.filter((violation) => !allowed.has(violation.id))
  const warned = blocking.filter((violation) => allowed.has(violation.id))

  // Las allowlisted no bloquean, pero se reportan para que no se olviden.
  for (const violation of warned) {
    const entry = ALLOWLIST[route]?.find((item) => item.rule === violation.id)
    testInfo.annotations.push({
      type: 'warning',
      description: `${route} → ${violation.id} (${violation.nodes.length} nodos) allowlisted: ${entry?.reason ?? 'sin razón documentada'}`,
    })
    console.warn(
      `⚠️  ${route} → ${violation.id} [${violation.impact}] ${violation.nodes.length} nodo(s) ` +
        `(allowlisted, no bloquea): ${entry?.reason ?? 'sin razón documentada'}`
    )
  }

  // Allowlist obsoleta: si la regla ya no aparece, hay que limpiar la entrada.
  for (const entry of ALLOWLIST[route] ?? []) {
    if (!blocking.some((violation) => violation.id === entry.rule)) {
      console.warn(
        `ℹ️  ${route} → la entrada de allowlist '${entry.rule}' ya no se dispara. ` +
          'Se puede eliminar de ALLOWLIST en e2e/accessibility.spec.ts.'
      )
    }
  }

  expect(
    disallowed,
    `Violaciones de accesibilidad ${[
      ...BLOCKING_IMPACTS,
    ].join('/')} en ${route}:\n\n${formatViolations(disallowed)}\n`
  ).toEqual([])
}

test.describe('Accesibilidad (axe) — rutas públicas', () => {
  test('landing "/" — WCAG 2.2 AA', async ({ page }, testInfo) => {
    await page.goto('/')
    await waitForPaint(page, () => page.getByRole('heading', { level: 1 }).first())

    const results = await runAxe(page, '/')
    await assertAccessible(page, testInfo, '/', results)
  })

  test('"/login" — WCAG 2.2 AA', async ({ page }, testInfo) => {
    await page.goto('/login')
    await waitForPaint(page, () => page.getByRole('heading', { name: /Ingresa a tu cuenta/i }))

    const results = await runAxe(page, '/login')
    await assertAccessible(page, testInfo, '/login', results)
  })

  test('"/seguridad" — WCAG 2.2 AA', async ({ page }, testInfo) => {
    await page.goto('/seguridad')
    await waitForPaint(page, () =>
      page.getByRole('heading', { name: /Tu cartola es sensible/i })
    )

    const results = await runAxe(page, '/seguridad')
    await assertAccessible(page, testInfo, '/seguridad', results)
  })

  test('"/#precios" (sección de precios de la landing) — WCAG 2.2 AA', async ({ page }, testInfo) => {
    await page.goto('/#precios')
    const pricing = page.locator('#precios')
    await waitForPaint(page, () =>
      pricing.getByRole('heading', { name: /Pago por análisis, sin suscripción/i })
    )

    // Scope a la sección: el resto de la landing ya se mide en el test de "/".
    const results = await runAxe(page, '/#precios', '#precios')
    await assertAccessible(page, testInfo, '/#precios', results)
  })
})
