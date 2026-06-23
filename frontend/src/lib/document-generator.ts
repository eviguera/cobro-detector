import type { Analysis, Anomaly } from '@/types/database.types'
import { formatCLP } from '@/lib/utils'
import { escapeXml } from '@/lib/security'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let docxModule: any = null
const getDocx = async () => {
  if (!docxModule) {
    docxModule = await import('docx')
  }
  return docxModule
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfLibModule: any = null
const getPdfLib = async () => {
  if (!pdfLibModule) {
    pdfLibModule = await import('pdf-lib')
  }
  return pdfLibModule
}

interface LetterData {
  analysis: Analysis
  anomalies: Anomaly[]
  bankName: string
  businessName: string
  userName: string
  rut: string
  date: string
}

async function generateComplaintLetter(data: LetterData): Promise<Document> {
  const docx = await getDocx()
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = docx
  const { analysis, anomalies, bankName, businessName, userName, rut, date } = data

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
                text: `Fecha: ${escapeXml(date)}`,
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
              new TextRun(escapeXml(userName || 'No especificado')),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'RUT: ', bold: true }),
              new TextRun(escapeXml(rut || 'No especificado')),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Empresa: ', bold: true }),
              new TextRun(escapeXml(businessName || 'No especificado')),
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
              new TextRun(escapeXml(bankName || analysis.bank || 'No especificado')),
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
                      children: [new Paragraph({ children: [new TextRun(escapeXml(anomaly.type.replace('_', ' ').toUpperCase()))] })],
                    }),
                    new TableCell({
                      children: [new Paragraph(escapeXml(anomaly.title || '')), new Paragraph({ children: [new TextRun({ text: escapeXml(anomaly.description || ''), size: 8 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(formatCLP(anomaly.recoverable_amount))] })],
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
                    children: [new Paragraph({ children: [new TextRun({ text: formatCLP(totalRecoverable), bold: true })] })],
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
            text: `En virtud de lo expuesto, solicito formalmente la devolución de la suma de ${formatCLP(totalRecoverable)}, correspondiente a cargos indebidos, comisiones duplicadas y/o errores en el cobro de cuotas detectados en el análisis de mi estado de cuenta.`,
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

  const totalRecoverable = data.anomalies.reduce((sum, a) => sum + a.recoverable_amount, 0)

  let currentPage = page
  let yPosition = height - 50

  function drawOrNewPage(drawFn: (_page: typeof currentPage) => number): void {
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

  currentPage.drawText(`Fecha: ${escapeXml(data.date)}`, {
    x: 50, y: yPosition, size: fontSize, font: boldFont,
  })
  yPosition -= 25

  currentPage.drawText('DATOS DEL RECLAMANTE', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20

  drawOrNewPage((_p) => { currentPage.drawText(`Nombre: ${escapeXml(data.userName)}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  drawOrNewPage((_p) => { currentPage.drawText(`RUT: ${escapeXml(data.rut || 'No especificado')}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  drawOrNewPage((_p) => { currentPage.drawText(`Empresa: ${escapeXml(data.businessName || 'No especificado')}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 25 })

  currentPage.drawText('DATOS DEL BANCO', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20
  drawOrNewPage((_p) => { currentPage.drawText(`Banco: ${escapeXml(data.bankName)}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  drawOrNewPage((_p) => { currentPage.drawText(`Período: ${data.analysis.period_start || 'N/A'} al ${data.analysis.period_end || 'N/A'}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 25 })

  currentPage.drawText('MOTIVO DEL RECLAMO', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20

  const motivo = 'Por medio de la presente, me dirijo a Uds. para formular reclamo formal por cobros indebidos detectados en el estado de cuenta correspondiente al período antes mencionado.'
  drawOrNewPage((_p) => { currentPage.drawText(motivo, { x: 50, y: yPosition, size: fontSize, font, maxWidth: 495 }); return yPosition - 40 })

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

    currentPage.drawText(`• ${escapeXml(anomaly.type.replace('_', ' ').toUpperCase())}: ${escapeXml(anomaly.title)}`, {
      x: 50, y: yPosition, size: 10, font: boldFont,
    })
    yPosition -= 15

    currentPage.drawText(`  ${escapeXml(anomaly.description || '')}`, {
      x: 50, y: yPosition, size: 9, font, maxWidth: 495,
    })
    yPosition -= 12

    currentPage.drawText(`  Monto: ${formatCLP(anomaly.recoverable_amount)}`, {
      x: 50, y: yPosition, size: 10, font,
    })
    yPosition -= 20
  }

  yPosition -= 20
  currentPage.drawText(`TOTAL A RECUPERAR: ${formatCLP(totalRecoverable)}`, {
    x: 50, y: yPosition, size: 14, font: boldFont, color: rgb(0.2, 0.4, 0.8),
  })
  yPosition -= 50

  currentPage.drawText('SOLICITUD', {
    x: 50, y: yPosition, size: 14, font: boldFont,
  })
  yPosition -= 20

  const solicitud = `En virtud de lo expuesto, solicito formalmente la devolución de la suma de ${formatCLP(totalRecoverable)}, correspondiente a cargos indebidos, comisiones duplicadas y/o errores en el cobro de cuotas detectados en el análisis de mi estado de cuenta.`
  drawOrNewPage((_p) => { currentPage.drawText(solicitud, { x: 50, y: yPosition, size: fontSize, font, maxWidth: 495 }); return yPosition - 40 })

  drawOrNewPage((_p) => { currentPage.drawText('Sin otro particular, saluda atentamente,', { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 30 })

  drawOrNewPage((_p) => { currentPage.drawText(escapeXml(data.userName || 'Firma'), { x: 50, y: yPosition, size: fontSize, font: boldFont }); return yPosition - 18 })
  drawOrNewPage((_p) => { currentPage.drawText(`RUT: ${escapeXml(data.rut || 'No especificado')}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 18 })
  drawOrNewPage((_p) => { currentPage.drawText(`Empresa: ${escapeXml(data.businessName || 'No especificado')}`, { x: 50, y: yPosition, size: fontSize, font }); return yPosition - 30 })

  currentPage.drawText('Este documento fue generado automáticamente por CobroDetector.cl', {
    x: 50, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
