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
          new Paragraph({
            text: 'CARTA DE RECLAMO FORMAL',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Fecha: ${date}`,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),

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

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
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
  const page = pdfDoc.addPage([595.28, 841.89])
  const { height } = page.getSize()
  const fontSize = 12
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }

  const totalRecoverable = data.anomalies.reduce((sum, a) => sum + a.recoverable_amount, 0)

  let currentPage = page
  let yPosition = height - 50

  function drawOrNewPage(drawFn: (page: typeof currentPage) => number): void {
    if (yPosition < 100) {
      currentPage = pdfDoc.addPage([595.28, 841.89])
      yPosition = height - 50
    }
    yPosition = drawFn(currentPage)
  }

  currentPage.drawText('CARTA DE RECLAMO FORMAL', {
    x: 50, y: yPosition, size: 18, font: boldFont, color: rgb(0, 0, 0),
  })
  yPosition -= 30

  currentPage.drawText(`Fecha: ${data.date}`, {
    x: 50, y: yPosition, size: fontSize, font: boldFont,
  })
  yPosition -= 25

  currentPage.drawText('DATOS DEL RECLAMANTE', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20

  drawOrNewPage((p) => { p.drawText(`Nombre: ${data.userName}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  yPosition -= 18
  drawOrNewPage((p) => { p.drawText(`RUT: ${data.rut || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  yPosition -= 18
  drawOrNewPage((p) => { p.drawText(`Empresa: ${data.businessName || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 25 })
  yPosition -= 25

  currentPage.drawText('DATOS DEL BANCO', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20
  drawOrNewPage((p) => { p.drawText(`Banco: ${data.bankName}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  yPosition -= 18
  drawOrNewPage((p) => { p.drawText(`Período: ${data.analysis.period_start || 'N/A'} al ${data.analysis.period_end || 'N/A'}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 25 })
  yPosition -= 25

  currentPage.drawText('MOTIVO DEL RECLAMO', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20

  const motivo = 'Por medio de la presente, me dirijo a Uds. para formular reclamo formal por cobros indebidos detectados en el estado de cuenta correspondiente al período antes mencionado.'
  drawOrNewPage((p) => { p.drawText(motivo, { x: 50, y: yPosition, size: fontSize, font, maxWidth: 495 }); return yPosition - 40 })
  yPosition -= 40

  currentPage.drawText('ANOMALÍAS DETECTADAS', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 25

  for (const anomaly of data.anomalies) {
    if (yPosition < 100) {
      currentPage = pdfDoc.addPage([595.28, 841.89])
      yPosition = height - 50
      currentPage.drawText('ANOMALÍAS DETECTADAS (continuación)', {
        x: 50, y: yPosition, size: 14, font: boldFont,
      })
      yPosition -= 25
    }

    currentPage.drawText(`• ${anomaly.type.replace('_', ' ').toUpperCase()}: ${anomaly.title}`, {
      x: 50, y: yPosition, size: 10, font: boldFont,
    })
    yPosition -= 15

    currentPage.drawText(`  ${anomaly.description || ''}`, {
      x: 50, y: yPosition, size: 9, font, maxWidth: 495,
    })
    yPosition -= 12

    currentPage.drawText(`  Monto: ${formatCurrency(anomaly.recoverable_amount)}`, {
      x: 50, y: yPosition, size: 10, font,
    })
    yPosition -= 20
  }

  yPosition -= 20
  currentPage.drawText(`TOTAL A RECUPERAR: ${formatCurrency(totalRecoverable)}`, {
    x: 50, y: yPosition, size: 14, font: boldFont, color: rgb(0.2, 0.4, 0.8),
  })
  yPosition -= 50

  currentPage.drawText('SOLICITUD', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20

  const solicitud = `En virtud de lo expuesto, solicito formalmente la devolución de la suma de ${formatCurrency(totalRecoverable)}, correspondiente a cargos indebidos, comisiones duplicadas y/o errores en el cobro de cuotas detectados en el análisis de mi estado de cuenta.`
  drawOrNewPage((p) => { p.drawText(solicitud, { x: 50, y: yPosition, size: fontSize, font, maxWidth: 495 }); return yPosition - 40 })
  yPosition -= 40

  drawOrNewPage((p) => { p.drawText('Sin otro particular, saluda atentamente,', { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 30 })
  yPosition -= 30

  drawOrNewPage((p) => { p.drawText(data.userName || 'Firma', { x: 50, y: yPosition, size: fontSize, font: boldFont }); return yPosition - 18 })
  yPosition -= 18
  drawOrNewPage((p) => { p.drawText(`RUT: ${data.rut || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  yPosition -= 18
  drawOrNewPage((p) => { p.drawText(`Empresa: ${data.businessName || 'No especificado'}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 30 })
  yPosition -= 30

  currentPage.drawText('Este documento fue generado automáticamente por CobroDetector.cl', {
    x: 50, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
