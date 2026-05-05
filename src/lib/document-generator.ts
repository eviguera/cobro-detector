// Dynamic imports for heavy libraries
let docxModule: any = null
const getDocx = async () => {
  if (!docxModule) {
    docxModule = await import('docx')
  }
  return docxModule
}

let pdfLibModule: any = null
const getPdfLib = async () => {
  if (!pdfLibModule) {
    pdfLibModule = await import('pdf-lib')
  }
  return pdfLibModule
}
import type { Analysis, Anomaly } from '@/types/database.types'

interface LetterData {
  analysis: Analysis
  anomalies: Anomaly[]
  bankName: string
  businessName: string
  userName: string
  rut: string
  date: string
}

export async function generateComplaintLetter(data: LetterData): Promise<Document> {
  const docx = await getDocx()
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } = docx
  const { analysis, anomalies, bankName, businessName, userName, rut, date } = data

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }

  const totalRecoverable = anomalies.reduce((sum, a) => sum + a.recoverable_amount, 0)

  return new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: 'CARTA DE RECLAMO FORMAL',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Fecha
          new Paragraph({
            children: [
              new TextRun({
                text: `Fecha: ${date}`,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Datos del reclamante
          new Paragraph({
            text: 'DATOS DEL RECLAMANTE',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Nombre: ', bold: true }),
              new TextRun(userName || 'No especificado'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'RUT: ', bold: true }),
              new TextRun(rut || 'No especificado'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Empresa: ', bold: true }),
              new TextRun(businessName || 'No especificado'),
            ],
            spacing: { after: 200 },
          }),

          // Datos del banco
          new Paragraph({
            text: 'DATOS DEL BANCO',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Banco: ', bold: true }),
              new TextRun(bankName || analysis.bank || 'No especificado'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Período analizado: ', bold: true }),
              new TextRun(`${analysis.period_start || 'N/A'} al ${analysis.period_end || 'N/A'}`),
            ],
            spacing: { after: 200 },
          }),

          // Motivo del reclamo
          new Paragraph({
            text: 'MOTIVO DEL RECLAMO',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            text: 'Por medio de la presente, me dirijo a Uds. para formular reclamo formal por cobros indebidos detectados en el estado de cuenta correspondiente al período antes mencionado.',
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'ANOMALÍAS DETECTADAS',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 },
          }),

          // Tabla de anomalías
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tipo', bold: true })] })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', bold: true })] })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Monto', bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              // Data rows
              ...anomalies.map(anomaly =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(anomaly.type.replace('_', ' ').toUpperCase())] })],
                    }),
                    new TableCell({
                      children: [new Paragraph(anomaly.title), new Paragraph({ children: [new TextRun({ text: anomaly.description || '', size: 8 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(formatCurrency(anomaly.recoverable_amount))] })],
                    }),
                  ],
                })
              ),
              // Total row
                new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL', bold: true })] })],
                    columnSpan: 2,
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalRecoverable), bold: true })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 200 } }),

          // Solicitud
          new Paragraph({
            text: 'SOLICITUD',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            text: `En virtud de lo expuesto, solicito formalmente la devolución de la suma de ${formatCurrency(totalRecoverable)}, correspondiente a cargos indebidos, comisiones duplicadas y/o errores en el cobro de cuotas detectados en el análisis de mi estado de cuenta.`,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'Asimismo, solicito que se adopten las medidas necesarias para evitar que estas situaciones se repitan en el futuro.',
            spacing: { after: 400 },
          }),

          // Cierre
          new Paragraph({
            text: 'Sin otro particular, saluda atentamente,',
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: userName || 'Firma', bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`RUT: ${rut || 'No especificado'}`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`Empresa: ${businessName || 'No especificado'}`),
            ],
          }),

          // Footer
          new Paragraph({
            text: 'Este documento fue generado automáticamente por CobroDetector.cl',
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  })
}

export async function generateWordDocument(data: LetterData): Promise<Buffer> {
  const docx = await getDocx()
  const { Packer } = docx
  const doc = await generateComplaintLetter(data)
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export async function generatePDFDocument(data: LetterData): Promise<Buffer> {
  const pdfLib = await getPdfLib()
  const { PDFDocument, rgb, StandardFonts } = pdfLib
  
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
  const { height } = page.getSize()
  const fontSize = 12
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }
  
  const totalRecoverable = data.anomalies.reduce((sum, a) => sum + a.recoverable_amount, 0)
  
  let yPosition = height - 50
  
  // Título
  page.drawText('CARTA DE RECLAMO FORMAL', {
    x: 50,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  yPosition -= 30
  
  // Fecha
  page.drawText(`Fecha: ${data.date}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: boldFont,
  })
  yPosition -= 25
  
  // Datos del reclamante
  page.drawText('DATOS DEL RECLAMANTE', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  })
  yPosition -= 20
  
  page.drawText(`Nombre: ${data.userName}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 18
  page.drawText(`RUT: ${data.rut || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 18
  page.drawText(`Empresa: ${data.businessName || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 25
  
  // Datos del banco
  page.drawText('DATOS DEL BANCO', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  })
  yPosition -= 20
  
  page.drawText(`Banco: ${data.bankName}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 18
  page.drawText(`Período: ${data.analysis.period_start || 'N/A'} al ${data.analysis.period_end || 'N/A'}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 25
  
  // Motivo
  page.drawText('MOTIVO DEL RECLAMO', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  })
  yPosition -= 20
  
  const motivo = 'Por medio de la presente, me dirijo a Uds. para formular reclamo formal por cobros indebidos detectados en el estado de cuenta correspondiente al período antes mencionado.'
  page.drawText(motivo, { x: 50, y: yPosition, size: fontSize, font, maxWidth: 495 })
  yPosition -= 40
  
  // Anomalías detectadas
  page.drawText('ANOMALÍAS DETECTADAS', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  })
  yPosition -= 25
  
  for (const anomaly of data.anomalies) {
    if (yPosition < 100) {
      // Nueva página si no hay espacio
      const newPage = pdfDoc.addPage([595.28, 841.89])
      yPosition = height - 50
      // Dibujar en la nueva página
      newPage.drawText('ANOMALÍAS DETECTADAS (continuación)', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
      })
      yPosition -= 25
      // Continuar con el bucle usando newPage
      // Para simplificar, continuamos usando 'page' pero actualizamos referencia
      Object.assign(page, newPage)
    }
    
    page.drawText(`• ${anomaly.type.replace('_', ' ').toUpperCase()}: ${anomaly.title}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: boldFont,
    })
    yPosition -= 15
    
    page.drawText(`  ${anomaly.description || ''}`, {
      x: 50,
      y: yPosition,
      size: 9,
      font,
      maxWidth: 495,
    })
    yPosition -= 12
    
    page.drawText(`  Monto: ${formatCurrency(anomaly.recoverable_amount)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
    })
    yPosition -= 20
  }
  
  // Total
  page.drawText(`TOTAL A RECUPERAR: ${formatCurrency(totalRecoverable)}`, {
    x: 50,
    y: yPosition - 20,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.8),
  })
  yPosition -= 50
  
  // Solicitud
  page.drawText('SOLICITUD', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  })
  yPosition -= 20
  
  const solicitud = `En virtud de lo expuesto, solicito formalmente la devolución de la suma de ${formatCurrency(totalRecoverable)}, correspondiente a cargos indebidos, comisiones duplicadas y/o errores en el cobro de cuotas detectados en el análisis de mi estado de cuenta.`
  page.drawText(solicitud, { x: 50, y: yPosition, size: fontSize, font, maxWidth: 495 })
  yPosition -= 40
  
  page.drawText('Sin otro particular, saluda atentamente,', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
  })
  yPosition -= 30
  
  page.drawText(data.userName || 'Firma', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: boldFont,
  })
  yPosition -= 18
  page.drawText(`RUT: ${data.rut || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 18
  page.drawText(`Empresa: ${data.businessName || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font })
  yPosition -= 30
  
  // Footer
  page.drawText('Este documento fue generado automáticamente por CobroDetector.cl', {
    x: 50,
    y: 30,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })
  
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
