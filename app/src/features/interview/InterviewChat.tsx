import { useState } from 'react'
import type {
  ChatMessage,
  EvaluationWithNextQuestionOutput,
  QuestionOnlyOutput,
  TurnEvaluation,
} from '../../shared/types/interviewTypes'

export type InterviewChatProps = {
  messages: ChatMessage[]
  currentQuestion: string
  currentQuestionType: string
  canAnswer: boolean
  isBusy: boolean
  onSubmitAnswer: (answer: string) => void
}

function ScoreGrid({ evaluation }: { evaluation: TurnEvaluation }) {
  const items: Array<{ label: string; value: number }> = [
    { label: '匹配度', value: evaluation.scores.relevance },
    { label: '准确性', value: evaluation.scores.correctness },
    { label: '覆盖度', value: evaluation.scores.coverage },
    { label: '结构', value: evaluation.scores.structure },
    { label: '深度', value: evaluation.scores.depth },
    { label: '清晰度', value: evaluation.scores.clarity },
  ]

  return (
    <div className="scoreGrid">
      {items.map((it) => (
        <div key={it.label} className="scoreCard">
          <div className="scoreLabel">{it.label}</div>
          <div className="scoreValue">{it.value}</div>
        </div>
      ))}
    </div>
  )
}

function renderParsedMessage(message: ChatMessage) {
  if (!message.parsed) {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
  }

  const parsed = message.parsed

  if (parsed.stage === 'question_only') {
    const q = parsed as QuestionOnlyOutput
    return (
      <div>
        <div className="msgMeta">AI 题型：{q.question_type}</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{q.question}</div>
      </div>
    )
  }

  if (parsed.stage === 'evaluation_with_next_question') {
    const out = parsed as EvaluationWithNextQuestionOutput
    return (
      <div>
        <div className="msgMeta">
          本轮评分：{out.evaluation.total_score} 分（题型：{out.question_type}）
        </div>
        <div className="msgContentScrollable">
          <div className="listBlock">
            <div className="listTitle">评价概述</div>
            {out.evaluation.question_restate ? (
              <div className="listItem">
                <b>题意：</b>
                {out.evaluation.question_restate}
              </div>
            ) : null}
            <div className="listItem">
              <b>要点：</b>
              <div style={{ marginTop: 6 }}>
                <div className="listTitle" style={{ marginTop: 8 }}>
                  优点
                </div>
                {out.evaluation.strengths.length ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {out.evaluation.strengths.map((s) => `- ${s}`).join('\n')}
                  </div>
                ) : (
                  <div className="hint">无</div>
                )}
                <div className="listTitle" style={{ marginTop: 8 }}>
                  不足
                </div>
                {out.evaluation.weaknesses.length ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {out.evaluation.weaknesses.map((s) => `- ${s}`).join('\n')}
                  </div>
                ) : (
                  <div className="hint">无</div>
                )}
                <div className="listTitle" style={{ marginTop: 8 }}>
                  改进建议
                </div>
                {out.evaluation.improvements.length ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {out.evaluation.improvements.map((s) => `- ${s}`).join('\n')}
                  </div>
                ) : (
                  <div className="hint">无</div>
                )}
              </div>
            </div>
          </div>

          <ScoreGrid evaluation={out.evaluation} />

          <div style={{ marginTop: 12 }}>
            <div className="listTitle">下一题</div>
            <div className="listItem">
              <div className="msgMeta" style={{ marginBottom: 0 }}>
                题型：{out.next_question.question_type}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
                {out.next_question.question}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // summary 在右侧不会直接渲染（用 modal 展示）
  return <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
}

export default function InterviewChat({
  messages,
  currentQuestion,
  canAnswer,
  isBusy,
  onSubmitAnswer,
}: InterviewChatProps) {
  return (
    <div className="chatPane">
      <div className="chatMessages">
        {messages.length === 0 ? (
          <div className="hint">等待 AI 发起第一题...</div>
        ) : null}

        {messages.map((m) => (
          <div className="msgRow" key={m.id}>
            <div className="msgAvatar">{m.role === 'assistant' ? 'AI' : '你'}</div>
            <div className="msgBubble">{renderParsedMessage(m)}</div>
          </div>
        ))}
      </div>

      <div className="chatComposer">
        <div>
          <div className="listTitle">当前题目</div>
          <div className="listItem" style={{ marginTop: 6 }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{currentQuestion || '—'}</div>
          </div>
        </div>

        <AnswerComposer
          canAnswer={canAnswer}
          isBusy={isBusy}
          disabled={!canAnswer || isBusy}
          onSubmitAnswer={onSubmitAnswer}
        />
      </div>
    </div>
  )
}

function AnswerComposer({
  disabled,
  canAnswer,
  isBusy,
  onSubmitAnswer,
}: {
  disabled: boolean
  canAnswer: boolean
  isBusy: boolean
  onSubmitAnswer: (answer: string) => void
}) {
  const [text, setText] = useState<string>('')

  // 注意：这里不使用复杂 hook，避免额外文件；简单可行但可后续优化。
  return (
    <div className="inputArea">
      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          canAnswer ? '请输入你的回答（尽量结构化：背景-过程-结果 / STAR）' : '请先上传简历并等待 AI 提问'
        }
        disabled={disabled}
      />
      <button
        className="btn btnPrimary"
        disabled={disabled}
        onClick={() => {
          const trimmed = text.trim()
          if (!trimmed) return
          onSubmitAnswer(trimmed)
          setText('')
        }}
      >
        {isBusy ? '处理中...' : '提交回答'}
      </button>
    </div>
  )
}

