import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

export type PdfViewerProps = {
  fileUrl: string
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      setLoading(true)
      setError(null)

      const container = containerRef.current
      if (!container) return

      container.innerHTML = ''

      try {
        const loadingTask = pdfjsLib.getDocument({ url: fileUrl })
        const pdf = await loadingTask.promise

        // 为了性能：限制最多渲染 MAX_PAGES 页（一般简历页数很少）
        const MAX_PAGES = 200
        const pageCount = Math.min(pdf.numPages, MAX_PAGES)

        for (let i = 1; i <= pageCount; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.0 })

          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto'
          canvas.style.maxWidth = '100%'
          canvas.style.height = 'auto'

          container.appendChild(canvas)

          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          const renderTask = page.render({ canvas: canvas, canvasContext: ctx, viewport })
          await renderTask.promise
        }

        if (!cancelled && pdf.numPages > MAX_PAGES) {
          const hint = document.createElement('div')
          hint.className = 'hint'
          hint.style.marginTop = '10px'
          hint.textContent = `已预览前 ${MAX_PAGES} 页（PDF 共 ${pdf.numPages} 页，可考虑后续分页/懒加载优化）`
          container.appendChild(hint)
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'PDF 渲染失败'
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  return (
    <div>
      {loading ? <div className="hint">PDF 渲染中，请稍候...</div> : null}
      {error ? <div className="hint">PDF 渲染失败：{error}</div> : null}
      <div ref={containerRef} />
    </div>
  )
}

