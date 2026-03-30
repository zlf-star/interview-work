import type { ResumeState } from '../../shared/types/interviewTypes'
import PdfViewer from './PdfViewer'
import DocxViewer from './DocxViewer'

export type ResumeViewerProps = {
  resume: ResumeState
}

export default function ResumeViewer({ resume }: ResumeViewerProps) {
  if (resume.status === 'none') return <div className="hint">请先上传简历（PDF 或 DOCX）。</div>
  if (resume.status === 'parsing') return <div className="hint">简历解析中，请稍候...</div>
  if (resume.status === 'error') {
    return <div className="hint">简历解析失败：{resume.error ?? '未知错误'}</div>
  }

  const fileKind = resume.fileKind
  const fileUrl = resume.fileUrl

  if (fileUrl && fileKind === 'pdf') {
    return <PdfViewer fileUrl={fileUrl} />
  }

  if (fileUrl && fileKind === 'docx') {
    return <DocxViewer fileUrl={fileUrl} />
  }

  // 渲染器兜底：如果文件类型/预览失败，就退回文本分段展示
  return (
    <>
      <div className="hint" style={{ marginBottom: 12 }}>
        当前简历（文本预览兜底）：{resume.fileName}
      </div>
      {resume.displaySegments.map((seg, idx) => (
        <div key={idx} className="resumeSegment">
          {seg}
        </div>
      ))}
    </>
  )
}

