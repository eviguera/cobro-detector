/**
 * Canales de reclamo por banco chileno.
 * Se usan en el plan de acción y en la carta para que el usuario sepa dónde
 * presentar el documento sin buscar en la web del banco.
 */

const CHANNELS: Record<string, string> = {
  santander: 'sucursal, app Santander o ejecutivo de cuenta (santander.cl → Ayuda → Reclamos)',
  bci: 'sucursal o bci.cl → Ayuda → Reclamos y sugerencias',
  'banco de chile': 'sucursal o bancochile.cl → Atención al cliente → Reclamos',
  chile: 'sucursal o bancochile.cl → Atención al cliente → Reclamos',
  estado: 'sucursal o bancoestado.cl → Atención al cliente',
  'banco estado': 'sucursal o bancoestado.cl → Atención al cliente',
  itau: 'sucursal o itau.cl → Atención al cliente',
  'itau corpbanca': 'sucursal o itau.cl → Atención al cliente',
  scotiabank: 'sucursal o scotiabank.cl → Reclamos',
  security: 'sucursal o security.cl → Reclamos',
  falabella: 'sucursal Falabella o app Banco Falabella → Reclamos',
  ripley: 'sucursal Ripley o app Banco Ripley → Reclamos',
}

export function bankClaimChannel(bank?: string | null): string {
  if (!bank) return 'sucursal o canal de atención al cliente del banco'
  const normalized = bank
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  for (const [key, channel] of Object.entries(CHANNELS)) {
    if (normalized.includes(key)) return channel
  }
  return 'sucursal o canal de atención al cliente del banco'
}
