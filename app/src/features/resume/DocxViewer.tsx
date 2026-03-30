import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'

export type DocxViewerProps = {
  fileUrl: string
}

export default function DocxViewer({ fileUrl }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      setLoading(true)
      setError(null)

      const container = containerRef.current
      if (!container) return

      container.innerHTML = ''

      try {
        await renderAsync(fileUrl, container, undefined, {
          className: 'docx',
          inWrapper: false,
          breakPages: true,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'DOCX 渲染失败'
        if (!cancelled) setError(message)
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
      {loading ? <div className="hint">DOCX 渲染中，请稍候...</div> : null}
      {error ? <div className="hint">DOCX 渲染失败：{error}</div> : null}
      <div ref={containerRef} />
    </div>
  )
}

