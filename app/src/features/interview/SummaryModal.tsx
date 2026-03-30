import type { SummaryResult } from '../../shared/types/interviewTypes'

export type SummaryModalProps = {
  open: boolean
  loading?: boolean
  result?: SummaryResult | null
  error?: string | null
  onClose: () => void
}

export default function SummaryModal({ open, loading, result, error, onClose }: SummaryModalProps) {
  if (!open) return null

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modalHeader">面试总结</div>
        <div className="modalBody">
          {loading ? <div className="hint">正在生成总结，请稍候...</div> : null}
          {!loading && error ? <div className="hint">{error}</div> : null}
          {!loading && !error && !result ? <div className="hint">无总结结果</div> : null}
          {!loading && result ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{result.overall_assessment}</div>

              <div className="listBlock">
                <div className="listTitle">掌握点</div>
                {result.mastery_points.length ? (
                  result.mastery_points.map((p, idx) => (
                    <div key={idx} className="listItem">
                      {p.point}
                      {p.evidence ? (
                        <div className="hint" style={{ marginTop: 6 }}>
                          证据：{p.evidence}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="hint">无</div>
                )}
              </div>

              <div className="listBlock" style={{ marginTop: 14 }}>
                <div className="listTitle">不足点</div>
                {result.weakness_points.length ? (
                  result.weakness_points.map((p, idx) => (
                    <div key={idx} className="listItem">
                      {p.point}
                      {p.impact ? (
                        <div className="hint" style={{ marginTop: 6 }}>
                          影响：{p.impact}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="hint">无</div>
                )}
              </div>

              <div className="listBlock" style={{ marginTop: 14 }}>
                <div className="listTitle">推荐复盘计划</div>
                {result.recommended_study_plan.length ? (
                  result.recommended_study_plan.map((p, idx) => (
                    <div key={idx} className="listItem">
                      <div style={{ fontWeight: 700 }}>{p.title}</div>
                      {p.timeframe ? <div className="hint">时间：{p.timeframe}</div> : null}
                      <div className="hint" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                        {p.actions.map((a) => `- ${a}`).join('\n')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="hint">无</div>
                )}
              </div>

              <div className="listBlock" style={{ marginTop: 14 }}>
                <div className="listTitle">面试策略</div>
                {result.interview_strategy.length ? (
                  <div className="hint" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.interview_strategy.map((s) => `- ${s}`).join('\n')}
                  </div>
                ) : (
                  <div className="hint">无</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <div className="modalActions">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

