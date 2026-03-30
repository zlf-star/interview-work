import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

export type ParsedResume = {
  fileName: string
  rawText: string
  displaySegments: string[]
  resumeSummary: string
}

const MAX_RAW_TEXT_CHARS = 40000
const MAX_SUMMARY_CHARS = 6000
const MAX_SEGMENTS = 200

function normalizeText(input: string) {
  return input.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
}

function splitToSegments(rawText: string): string[] {
  const norm = normalizeText(rawText).trim()
  if (!norm) return []

  // 先按空行分段，失败再按行分段
  const byBlankLines = norm.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  if (byBlankLines.length >= 2) return byBlankLines.slice(0, MAX_SEGMENTS)

  const byLines = norm.split('\n').map((s) => s.trim()).filter(Boolean)
  return byLines.slice(0, MAX_SEGMENTS)
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const fileName = file.name
  const arrayBuffer = await file.arrayBuffer()

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(fileName)
  const isDocx =
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(fileName)

  if (!isPdf && !isDocx) {
    throw new Error('不支持的文件类型：仅支持 PDF 或 DOCX')
  }

  let rawText = ''

  if (isPdf) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const pageTexts: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const strings = textContent.items.map((it) => ((it as { str?: string }).str ?? '') as string).join(' ')
      pageTexts.push(strings)
    }
    rawText = pageTexts.join('\n\n')
  } else if (isDocx) {
    const result = await mammoth.extractRawText({ arrayBuffer })
    rawText = result.value ?? ''
  }

  rawText = normalizeText(rawText).trim()
  if (!rawText) {
    throw new Error('简历解析结果为空：请确认文件可被正常解析。')
  }

  const truncatedRawText = rawText.slice(0, MAX_RAW_TEXT_CHARS)
  const displaySegments = splitToSegments(truncatedRawText)
  const resumeSummary = rawText.slice(0, MAX_SUMMARY_CHARS).trim()

  return {
    fileName,
    rawText: truncatedRawText,
    displaySegments,
    resumeSummary,
  }
}

