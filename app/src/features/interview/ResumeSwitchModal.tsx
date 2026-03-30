export type ResumeSwitchModalProps = {
  open: boolean
  mode: 'switch' | 'end'
  onCancel: () => void
  onConfirmEndAndNoSummary: () => void
  onConfirmEndAndSummary: () => void
  description?: string
}

export default function ResumeSwitchModal({
  open,
  mode,
  onCancel,
  onConfirmEndAndNoSummary,
  onConfirmEndAndSummary,
  description,
}: ResumeSwitchModalProps) {
  if (!open) return null

  const title = mode === 'switch' ? '结束本次面试并更换简历？' : '结束本次面试？'
  const desc =
    description ??
    '你可以选择继续面试，或结束本次面试并决定是否生成总结。'

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modalHeader">{title}</div>
        <div className="modalBody">
          <div style={{ whiteSpace: 'pre-wrap' }}>{desc}</div>
          <div className="hint" style={{ marginTop: 10 }}>
            建议：若你希望获得复盘结论，选择“结束并生成总结”。
          </div>
        </div>
        <div className="modalActions">
          <button className="btn" onClick={onCancel}>
            继续面试
          </button>
          <button className="btn" onClick={onConfirmEndAndNoSummary}>
            结束（不总结）
          </button>
          <button className="btn btnPrimary" onClick={onConfirmEndAndSummary}>
            结束并生成总结
          </button>
        </div>
      </div>
    </div>
  )
}

