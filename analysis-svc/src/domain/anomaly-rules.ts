import type { DetectedAnomaly, ParsedTransaction } from './analysis-result.entity'

/**
 * Motor de reglas determinístico de CobroDetector.
 *
 * Objetivo: precisión antes que volumen. Cada hallazgo debe poder explicarse
 * con transacciones concretas y su monto recuperable debe ser la suma de
 * cobros que realmente sobran (nunca el total del cargo legítimo).
 */

const COMMISSION_RE =
  /(comisi[oó]n|comissao|com\.?\s*(de\s*)?(cr[eé]dito|credito|tc|avance|compra)|cargo\s+por\s+comisi[oó]n)/i

const INTEREST_RE = /(?<!sin\s)(inter[eé]s(?:es)?|int\.?\s*corriente)/i

const INSTALLMENT_RE =
  /((\d{1,2})\s*(cuotas?|c\/)\s*(sin\s*inter[eé]s|0\s*%|sin\s*interes)?|cuota\s*\d+\s*\/\s*\d+|venta\s+en\s+cuotas)/i

const GENERIC_RE =
  /^(com|com\.|cargo|cobro|serv|servicio|fee|adm|admin|administraci[oó]n|trf|transf|transacci[oó]n|operaci[oó]n)\b/i

const KNOWN_FEE_RE =
  /(mantenci[oó]n|mantencion|administraci[oó]n|administracion|seguro|anualidad|suscripci[oó]n|suscripcion|impuesto|iva|patente|comisi[oó]n\s+por\s+mantenci[oó]n)/i

const STOP_WORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'por', 'para', 'con', 'sin', 'y', 'en',
  'comision', 'comisión', 'credito', 'crédito', 'tc', 'td', 'compra', 'venta',
  'cuota', 'cuotas', 'pago', 'cargo', 'abono', 'transaccion', 'transacción',
  'nacional', 'internacional', 'internet', 'web', 'app',
  'interes', 'intereses', 'corriente',
])

export const SEVERITY_SCORE: Record<DetectedAnomaly['severity'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

function normalizeText(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function monthOf(date: string): string {
  return (date ?? '').slice(0, 7)
}

function daysBetween(a: string, b: string): number {
  const first = new Date(`${a}T00:00:00Z`).getTime()
  const second = new Date(`${b}T00:00:00Z`).getTime()
  if (!Number.isFinite(first) || !Number.isFinite(second)) return Number.MAX_SAFE_INTEGER
  return Math.abs(first - second) / 86_400_000
}

function merchantTokens(description: string): string[] {
  return normalizeText(description)
    .replace(/\d+/g, ' ')
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

export function merchantKey(description: string): string {
  const tokens = merchantTokens(description)
  return tokens.slice(0, 3).join(' ').slice(0, 32)
}

export function isCommission(description: string): boolean {
  return COMMISSION_RE.test(description)
}

export function isInterest(description: string): boolean {
  return INTEREST_RE.test(description)
}

export function isInstallmentSale(description: string): boolean {
  return INSTALLMENT_RE.test(description)
}

function isKnownFee(description: string): boolean {
  return KNOWN_FEE_RE.test(description)
}

function isGenericDescription(description: string): boolean {
  const normalized = normalizeText(description)
  if (normalized.length === 0) return true

  // Un comercio corto ("UBER", "SHELL") NO es un cargo genérico. Solo lo son
  // descripciones con prefijo de sistema (COM, CARGO, SERV…) o códigos sin
  // ningún token alfabético identificable.
  if (GENERIC_RE.test(normalized)) {
    // "PAGO TARJETA" es una operación normal, no un cargo sin respaldo.
    if (/^pago\b/.test(normalized)) return false
    const tokens = normalized.split(' ').filter(Boolean)
    return tokens.length <= 3
  }

  const alphaTokens = normalized
    .split(' ')
    .filter((token) => /^[a-z]{4,}$/.test(token))
  return alphaTokens.length === 0
}

function amountsClose(a: number, b: number): boolean {
  const diff = Math.abs(Math.abs(a) - Math.abs(b))
  return diff <= Math.max(1, Math.abs(a) * 0.01)
}

function roundMoney(value: number): number {
  return Math.round(Math.abs(value))
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildEvidence(
  transactions: ParsedTransaction[],
  merchant?: string
): DetectedAnomaly['evidence'] {
  const dates = [...new Set(transactions.map((tx) => tx.date))].sort()
  return {
    period: monthOf(dates[0] ?? ''),
    merchant: merchant || undefined,
    count: transactions.length,
    dates,
    amounts: transactions.map((tx) => roundMoney(tx.amount)),
  }
}

function recommendationFor(type: string): string {
  switch (type) {
    case 'duplicate_commission':
    case 'duplicate_charge':
      return 'Presenta la carta en el banco y solicita el reverso de las comisiones repetidas. Cita la fecha y el monto de cada una; el banco tiene 10 días hábiles para responder.'
    case 'installment_error':
      return 'Solicita el recálculo de las cuotas. Adjunta el comprobante de la venta en cuotas sin interés y las cuotas cobradas de más.'
    case 'unknown_charge':
      return 'Pide por escrito el detalle del cargo. Si no pueden justificarlo, exige el reverso inmediato. Si no responden en 10 días, escala a la CMF.'
    case 'incorrect_charge':
      return 'Compara el cargo con tus registros. Si no corresponde, presenta la carta solicitando el reverso del monto.'
    default:
      return 'Presenta la carta en el banco para solicitar el reverso del cargo detectado.'
  }
}

/* -------------------------------------------------------------------------- */
/* Regla 1: comisión de crédito repetida                                      */
/* -------------------------------------------------------------------------- */

function detectDuplicateCommissions(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []
  const commissions = transactions.filter(
    (tx) => tx.amount < 0 && isCommission(tx.description) && !isKnownFee(tx.description)
  )

  const groups = new Map<string, ParsedTransaction[]>()
  for (const tx of commissions) {
    const key = `${monthOf(tx.date)}|${merchantKey(tx.description)}|${Math.round(Math.abs(tx.amount) / 100)}`
    const group = groups.get(key) ?? []
    group.push(tx)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    if (!group.every((tx) => amountsClose(tx.amount, group[0].amount))) continue

    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date))
    const extras = sorted.slice(1)
    const recoverableAmount = extras.reduce((sum, tx) => sum + roundMoney(tx.amount), 0)
    if (recoverableAmount <= 0) continue

    const merchant = merchantKey(sorted[0].description)
    const hasInstallmentContext = transactions.some(
      (tx) =>
        monthOf(tx.date) === monthOf(sorted[0].date) &&
        isInstallmentSale(tx.description) &&
        (merchant === '' || merchantKey(tx.description) === merchant)
    )

    const confidence = clampConfidence(hasInstallmentContext ? 92 : 68)
    const severity = hasInstallmentContext ? 'high' : 'medium'

    anomalies.push({
      type: 'duplicate_commission',
      severity,
      title: `Comisión de crédito cobrada ${group.length} veces`,
      description: `La comisión de crédito debe cobrarse una sola vez por operación. Detectamos ${group.length} cobros${merchant ? ` asociados a "${merchant}"` : ''} en ${monthOf(sorted[0].date)}.`,
      detail: `Período: ${monthOf(sorted[0].date)} · Monto unitario: $${roundMoney(sorted[0].amount).toLocaleString('es-CL')} · Cobros: ${group.length}`,
      recoverableAmount,
      transactionRefs: extras.map((tx) => tx.id),
      confidence,
      evidence: buildEvidence(sorted, merchant),
      recommendedAction: recommendationFor('duplicate_commission'),
    })
  }

  return anomalies
}

/* -------------------------------------------------------------------------- */
/* Regla 2: cobro duplicado (mismo monto, mismo comercio, ventana corta)       */
/* -------------------------------------------------------------------------- */

function detectDuplicateCharges(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []
  const charges = transactions.filter(
    (tx) =>
      tx.amount < 0 &&
      !isCommission(tx.description) &&
      !isInterest(tx.description) &&
      merchantKey(tx.description) !== ''
  )

  const groups = new Map<string, ParsedTransaction[]>()
  for (const tx of charges) {
    const key = `${merchantKey(tx.description)}|${roundMoney(tx.amount)}`
    const group = groups.get(key) ?? []
    group.push(tx)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date))

    // Clusterizar por cercanía temporal: dos cargos iguales con 45 días de
    // diferencia pueden ser una suscripción legítima, no un duplicado.
    let cluster: ParsedTransaction[] = [sorted[0]]
    const flush = () => {
      if (cluster.length < 2) return
      const extras = cluster.slice(1)
      const recoverableAmount = extras.reduce((sum, tx) => sum + roundMoney(tx.amount), 0)
      if (recoverableAmount <= 0) return

      const sameDay = new Set(cluster.map((tx) => tx.date)).size === 1
      const confidence = clampConfidence(sameDay ? 80 : 62)
      const merchant = merchantKey(cluster[0].description)

      anomalies.push({
        type: 'duplicate_charge',
        severity: sameDay ? 'high' : 'medium',
        title: `Cobro duplicado: ${merchant || cluster[0].description.slice(0, 32)}`,
        description: `Se detectó el mismo cargo de $${roundMoney(cluster[0].amount).toLocaleString('es-CL')} ${cluster.length} veces en ${sameDay ? 'la misma fecha' : 'menos de 10 días'}.`,
        detail: `Fechas: ${cluster.map((tx) => tx.date).join(', ')} · Monto unitario: $${roundMoney(cluster[0].amount).toLocaleString('es-CL')}`,
        recoverableAmount,
        transactionRefs: extras.map((tx) => tx.id),
        confidence,
        evidence: buildEvidence(cluster, merchant),
        recommendedAction: recommendationFor('duplicate_charge'),
      })
    }

    for (const tx of sorted.slice(1)) {
      const previous = cluster[cluster.length - 1]
      if (daysBetween(previous.date, tx.date) <= 10 && amountsClose(previous.amount, tx.amount)) {
        cluster.push(tx)
      } else {
        flush()
        cluster = [tx]
      }
    }
    flush()
  }

  return anomalies
}

/* -------------------------------------------------------------------------- */
/* Regla 3: intereses cobrados en ventas "sin interés"                        */
/* -------------------------------------------------------------------------- */

function detectInstallmentErrors(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []
  const sales = transactions.filter((tx) => tx.amount < 0 && isInstallmentSale(tx.description))
  const interests = transactions.filter((tx) => tx.amount < 0 && isInterest(tx.description))

  const usedInterestIds = new Set<string>()

  for (const sale of sales) {
    const merchant = merchantKey(sale.description)
    const sameMonth = interests.filter(
      (tx) =>
        !usedInterestIds.has(tx.id) &&
        monthOf(tx.date) === monthOf(sale.date) &&
        (merchant === '' || merchantKey(tx.description) === merchant)
    )
    if (sameMonth.length === 0) continue

    const recoverableAmount = sameMonth.reduce((sum, tx) => sum + roundMoney(tx.amount), 0)
    if (recoverableAmount <= 0) continue

    sameMonth.forEach((tx) => usedInterestIds.add(tx.id))

    anomalies.push({
      type: 'installment_error',
      severity: 'high',
      title: `Intereses en venta sin interés${merchant ? `: ${merchant}` : ''}`,
      description: `${sale.description} se pactó en cuotas sin interés, pero se cobraron intereses en el mismo período.`,
      detail: `Venta: ${sale.date} · Intereses: ${sameMonth.map((tx) => tx.date).join(', ')} · Monto: $${recoverableAmount.toLocaleString('es-CL')}`,
      recoverableAmount,
      transactionRefs: sameMonth.map((tx) => tx.id),
      confidence: clampConfidence(merchant ? 78 : 62),
      evidence: buildEvidence(sameMonth, merchant),
      recommendedAction: recommendationFor('installment_error'),
    })
  }

  return anomalies
}

/* -------------------------------------------------------------------------- */
/* Regla 4: cargos genéricos sin descripción verificable                      */
/* -------------------------------------------------------------------------- */

function detectGenericCharges(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []

  const candidates = transactions.filter(
    (tx) =>
      tx.amount < 0 &&
      roundMoney(tx.amount) >= 1_000 &&
      !isCommission(tx.description) &&
      !isInterest(tx.description) &&
      !isInstallmentSale(tx.description) &&
      !isKnownFee(tx.description) &&
      isGenericDescription(tx.description)
  )

  for (const tx of candidates) {
    anomalies.push({
      type: 'unknown_charge',
      severity: 'low',
      title: `Cargo sin descripción clara: "${tx.description.slice(0, 40)}"`,
      description:
        'El cargo tiene una descripción genérica o un código que no permite asociarlo a una operación real. Pide el detalle antes de reclamarlo como definitivo.',
      detail: `Fecha: ${tx.date} · Monto: $${roundMoney(tx.amount).toLocaleString('es-CL')} · Descripción original: ${tx.description}`,
      recoverableAmount: roundMoney(tx.amount),
      transactionRefs: [tx.id],
      confidence: 42,
      evidence: buildEvidence([tx]),
      recommendedAction: recommendationFor('unknown_charge'),
    })
  }

  return anomalies
}

/* -------------------------------------------------------------------------- */
/* Regla 5: anomalías etiquetadas en el propio CSV                            */
/* -------------------------------------------------------------------------- */

const LABELED_TYPES: Record<string, { type: string; severity: DetectedAnomaly['severity'] }> = {
  COBRO_DOBLE: { type: 'duplicate_commission', severity: 'high' },
  COBRO_ALTO_DUPLICADO: { type: 'duplicate_commission', severity: 'high' },
  COBRO_INCORRECTO: { type: 'incorrect_charge', severity: 'medium' },
}

function detectLabeledAnomalies(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []
  const processed = new Set<string>()
  const byId = new Map(transactions.map((tx) => [tx.id, tx]))

  for (const tx of transactions) {
    const rawLabel = (tx.tipoAnomalia ?? '').toUpperCase()
    const mapping = LABELED_TYPES[rawLabel]
    if (!mapping || processed.has(tx.id)) continue

    processed.add(tx.id)
    const group: ParsedTransaction[] = [tx]

    if (tx.idTransaccionReferencia) {
      const partner = byId.get(tx.idTransaccionReferencia)
      if (partner && !processed.has(partner.id)) {
        group.push(partner)
        processed.add(partner.id)
      }
    }

    group.sort((a, b) => a.date.localeCompare(b.date))
    const extras = group.length > 1 ? group.slice(1) : group
    const recoverableAmount = extras.reduce((sum, item) => sum + roundMoney(item.amount), 0)
    if (recoverableAmount <= 0) continue

    const reason = tx.motivoReclamo?.trim()
    const merchant = merchantKey(tx.description)

    anomalies.push({
      type: mapping.type,
      severity: mapping.severity,
      title:
        mapping.type === 'incorrect_charge'
          ? reason || `Cobro incorrecto: ${tx.description.slice(0, 48)}`
          : `Cobro duplicado: ${merchant || tx.description.slice(0, 48)}`,
      description:
        reason ||
        `El propio estado de cuenta marca este cargo como ${rawLabel.replaceAll('_', ' ').toLowerCase()}.`,
      detail: `Origen: etiqueta del archivo · Fechas: ${group.map((item) => item.date).join(', ')} · Monto: $${recoverableAmount.toLocaleString('es-CL')}`,
      recoverableAmount,
      transactionRefs: extras.map((item) => item.id),
      confidence: 98,
      evidence: buildEvidence(group, merchant),
      recommendedAction: recommendationFor(mapping.type),
    })
  }

  return anomalies
}

export function detectRuleAnomalies(transactions: ParsedTransaction[]): DetectedAnomaly[] {
  const labeled = detectLabeledAnomalies(transactions)

  // Las filas ya etiquetadas por el CSV (o referenciadas por una etiqueta) no
  // deben volver a detectarse con otra regla: duplicaría el hallazgo y el monto.
  const claimedByLabel = new Set(labeled.flatMap((anomaly) => anomaly.transactionRefs))
  const remaining = transactions.filter(
    (tx) => !claimedByLabel.has(tx.id) && !(tx.tipoAnomalia ?? '').trim()
  )

  return [
    ...labeled,
    ...detectDuplicateCommissions(remaining),
    ...detectInstallmentErrors(remaining),
    ...detectDuplicateCharges(remaining),
    ...detectGenericCharges(remaining),
  ]
}

/* -------------------------------------------------------------------------- */
/* Normalización de anomalías de IA                                           */
/* -------------------------------------------------------------------------- */

export function normalizeAiAnomalies(
  raw: Array<Record<string, unknown>>,
  transactions: ParsedTransaction[]
): DetectedAnomaly[] {
  const byId = new Map(transactions.map((tx) => [tx.id, tx]))
  const anomalies: DetectedAnomaly[] = []

  for (const item of raw) {
    const type = typeof item.type === 'string' ? item.type : ''
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const rawRefs = Array.isArray(item.transactionRefs)
      ? item.transactionRefs.filter((ref): ref is string => typeof ref === 'string')
      : []
    const refs = rawRefs.filter((ref) => byId.has(ref))
    // Sin transacciones verificables no publicamos un hallazgo: la IA puede
    // describir patrones, pero no puede inventar cobros.
    if (!type || !title || refs.length === 0) continue

    const referenced = refs.map((ref) => byId.get(ref)!).filter(Boolean)
    const maxRecoverable = referenced.reduce((sum, tx) => sum + roundMoney(tx.amount), 0)
    const declared = Number(item.recoverableAmount)
    if (!Number.isFinite(declared) || declared <= 0) continue

    anomalies.push({
      type,
      severity: item.severity === 'high' || item.severity === 'medium' ? item.severity : 'low',
      title,
      description:
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim().slice(0, 500)
          : 'Hallazgo detectado por el modelo de lenguaje.',
      detail: typeof item.detail === 'string' ? item.detail.slice(0, 500) : undefined,
      recoverableAmount: Math.min(roundMoney(declared), maxRecoverable),
      transactionRefs: refs,
      confidence: 58,
      evidence: buildEvidence(referenced, merchantKey(referenced[0]?.description ?? '')),
      recommendedAction: recommendationFor(type),
    })
  }

  return anomalies
}

/* -------------------------------------------------------------------------- */
/* Merge y anti doble conteo                                                  */
/* -------------------------------------------------------------------------- */

export function mergeAnomalies(
  ruleAnomalies: DetectedAnomaly[],
  aiAnomalies: DetectedAnomaly[]
): DetectedAnomaly[] {
  const merged: DetectedAnomaly[] = []

  for (const anomaly of [...ruleAnomalies, ...aiAnomalies]) {
    const existing = merged.find(
      (candidate) =>
        candidate.type === anomaly.type &&
        candidate.transactionRefs.some((ref) => anomaly.transactionRefs.includes(ref))
    )

    if (!existing) {
      merged.push({ ...anomaly, transactionRefs: [...new Set(anomaly.transactionRefs)] })
      continue
    }

    const keep = (existing.confidence ?? 0) >= (anomaly.confidence ?? 0) ? existing : anomaly
    existing.transactionRefs = [...new Set([...existing.transactionRefs, ...anomaly.transactionRefs])]
    existing.confidence = Math.max(existing.confidence ?? 0, anomaly.confidence ?? 0)
    existing.severity =
      SEVERITY_SCORE[keep.severity] >= SEVERITY_SCORE[existing.severity]
        ? keep.severity
        : existing.severity
    existing.recoverableAmount = Math.max(existing.recoverableAmount, anomaly.recoverableAmount)
  }

  // Cada transacción recuperable se reclama una sola vez. Si dos hallazgos
  // comparten referencias, el segundo se recorta para no inflar el total.
  const claimed = new Set<string>()
  const unique: DetectedAnomaly[] = []

  for (const anomaly of merged.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))) {
    const refs = [...new Set(anomaly.transactionRefs)]
    const unclaimed = refs.filter((ref) => !claimed.has(ref))

    if (refs.length > 0 && unclaimed.length === 0) continue

    const amount = Math.max(0, Math.round(anomaly.recoverableAmount))
    if (amount === 0) continue

    unclaimed.forEach((ref) => claimed.add(ref))
    unique.push({ ...anomaly, transactionRefs: unclaimed.length > 0 ? unclaimed : refs, recoverableAmount: amount })
  }

  return unique.sort(
    (a, b) =>
      SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity] || b.recoverableAmount - a.recoverableAmount
  )
}

/* -------------------------------------------------------------------------- */
/* Resumen determinístico (fallback si la IA no responde)                     */
/* -------------------------------------------------------------------------- */

export function buildDeterministicSummary(
  anomalies: DetectedAnomaly[],
  totalTransactions: number,
  bank?: string
): string {
  const bankLabel = bank ? ` de ${bank}` : ''

  if (anomalies.length === 0) {
    return `Revisamos ${totalTransactions} movimientos${bankLabel} y no encontramos comisiones duplicadas, intereses en cuotas sin interés ni cargos sin respaldo.`
  }

  const total = anomalies.reduce((sum, anomaly) => sum + anomaly.recoverableAmount, 0)
  const largest = anomalies.reduce((best, anomaly) =>
    anomaly.recoverableAmount > best.recoverableAmount ? anomaly : best
  )
  const high = anomalies.filter((anomaly) => anomaly.severity === 'high').length

  return [
    `Revisamos ${totalTransactions} movimientos${bankLabel} y detectamos ${anomalies.length} hallazgo${anomalies.length === 1 ? '' : 's'} por un total de $${total.toLocaleString('es-CL')}.`,
    high > 0 ? `${high} son de prioridad alta.` : '',
    `El más relevante: ${largest.title} ($${largest.recoverableAmount.toLocaleString('es-CL')}).`,
    'Revisa la evidencia de cada hallazgo y presenta la carta en el banco.',
  ]
    .filter(Boolean)
    .join(' ')
}
