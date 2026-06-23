import * as fs from 'fs'

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const merchants = [
  'RIPLEY VESTUARIO', 'FALABELLA ELECTRO', 'PARIS HOGAR', 'JUMBO SUPERMERCADO',
  'LIDER HIPER', 'SANTA ISABEL', 'EASY CONSTRUCCION', 'SODIMAC MATERIALES',
  'MCDONALDS', 'STARBUCKS', 'UBER TRIP', 'CABIFY VIAJE', 'NETFLIX SUSCRIPCION',
  'SPOTIFY PREMIUM', 'APPLE STORE', 'GOOGLE PLAY', 'AMAZON PRIME', 'DISNEY PLUS',
  'SHELL COMBUSTIBLE', 'COPEC GASOLINA', 'ENTEL TELEFONIA', 'MOVISTAR INTERNET',
  'VTR CABLE', 'METROGAS SERVICIO', 'ENEL ELECTRICIDAD', 'ESVAL AGUA',
  'FARMACIAS AHUMADA', 'CRUZ VERDE', 'SALCOBRAND', 'PLAZA VESPUCIO COMIDA',
  'CINEMARK CINE', 'H&M ROPA', 'ZARA MODA', 'ADIDAS DEPORTE', 'NIKE RUNNING',
  'SKECHERS CALZADO', 'LA POLAR ELECTRO', 'ABCDIN MUEBLES', 'CENCOSUD VARIOS',
  'WALMART COMPRAS', 'PEDIDOSYA COMIDA', 'RAPPI DELIVERY', 'CORREOS CHILE ENVIO',
]

const categories = [
  'Vestuario', 'Electrónica', 'Hogar', 'Supermercado', 'Servicios',
  'Comida', 'Combustible', 'Telefonía', 'Salud', 'Entretención',
  'Transporte', 'Suscripción', 'Comisiones', 'Seguros', 'Educación',
]

const normalDescriptions = [
  'COMPRA NACIONAL', 'PAGO AUTOMATICO', 'TRANSFERENCIA ELECTRONICA',
  'COMPRA INTERNACIONAL', 'COMPRA CUOTAS', 'PAGO SERVICIO', 'CARGO AUTOMATICO',
  'ABONO REMUNERACION', 'DEPOSITO PLAZO FIJO', 'RETIRO CAJERO',
]

const comisionKeywords = [
  'COMISION CREDITO', 'COM CREDITO CUOTAS', 'COMISION TC',
  'COM. CREDITO NAC', 'COMISSAO CREDITO',
]

const rows: string[] = []
const header = 'id_transaccion,fecha,descripcion,categoria,monto,tipo_anomalia,id_transaccion_referencia,reclamable,motivo_reclamo'
rows.push(header)

let id = 0

function genId(): string {
  id++
  return `T${id.toString().padStart(4, '0')}`
}

function addNormalRow(): void {
  const merchant = merchants[Math.floor(Math.random() * merchants.length)]
  const cat = categories[Math.floor(Math.random() * categories.length)]
  const normalDesc = normalDescriptions[Math.floor(Math.random() * normalDescriptions.length)]
  const amount = -(Math.floor(Math.random() * 450_000) + 5_000)
  rows.push(`${genId()},${randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))},${normalDesc} ${merchant},${cat},${amount},,,,`)
}

function addDobles(): void {
  for (let i = 0; i < 100; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)]
    const cat = categories[Math.floor(Math.random() * categories.length)]
    const amount = -(Math.floor(Math.random() * 350_000) + 20_000)
    const date = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))
    const motivo = `Cobro duplicado de ${merchant}`
    const id1 = genId()
    const id2 = genId()
    rows.push(`${id1},${date},VENTA CUOTAS ${merchant},${cat},${amount},COBRO_DOBLE,${id2},SI,${motivo}`)
    rows.push(`${id2},${date},VENTA CUOTAS ${merchant},${cat},${amount},COBRO_DOBLE,${id1},SI,${motivo}`)
  }
}

function addAltosDuplicados(): void {
  for (let i = 0; i < 50; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)]
    const cat = categories[Math.floor(Math.random() * categories.length)]
    const amount = -(Math.floor(Math.random() * 800_000) + 200_000)
    const date = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))
    const motivo = `Cargo duplicado alto en ${merchant}`
    const id1 = genId()
    const id2 = genId()
    rows.push(`${id1},${date},COMPRA ${merchant} ALTO VALOR,${cat},${amount},COBRO_ALTO_DUPLICADO,${id2},SI,${motivo}`)
    rows.push(`${id2},${date},COMPRA ${merchant} ALTO VALOR,${cat},${amount},COBRO_ALTO_DUPLICADO,${id1},SI,${motivo}`)
  }
}

function addIncorrectos(): void {
  for (let i = 0; i < 50; i++) {
    const kw = comisionKeywords[Math.floor(Math.random() * comisionKeywords.length)]
    const cat = 'Comisiones'
    const amount = -(Math.floor(Math.random() * 50_000) + 5_000)
    const date = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))
    const motivo = 'Comisión no corresponde según contrato'
    rows.push(`${genId()},${date},${kw} MENSUAL,${cat},${amount},COBRO_INCORRECTO,,SI,${motivo}`)
  }
}

// 2,650 normales
for (let i = 0; i < 2650; i++) addNormalRow()

// 200 cobros dobles (100 pares)
addDobles()

// 100 cobros altos duplicados (50 pares)
addAltosDuplicados()

// 50 cobros incorrectos
addIncorrectos()

const csv = rows.join('\n')
fs.writeFileSync('test-3000-transacciones.csv', csv)
console.log(`CSV generado: ${rows.length - 1} transacciones (${rows.length} líneas incluyendo header)`)
console.log(`Anomalías: 200 dobles + 100 altos duplicados + 50 incorrectos = 350`)
