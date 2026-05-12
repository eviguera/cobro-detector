// Test rápido de parsing + reglas
const XLSX = require('xlsx')
const fs = require('fs')

const buffer = fs.readFileSync('prueba.csv')
const workbook = XLSX.read(buffer, { type: 'buffer' })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { raw: false })

console.log(`Filas parseadas: ${rows.length}`)
console.log('Headers:', Object.keys(rows[0]))
console.log('Primera fila:', JSON.stringify(rows[0]))
console.log('Última fila:', JSON.stringify(rows[rows.length-1]))
