import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChatMessage,
  CoverageState,
  EvaluationWithNextQuestionOutput,
  QuestionType,
  ResumeState,
  SummaryResult,
  TurnEvaluation,
} from '../../shared/types/interviewTypes'
import { EMPTY_COVERAGE_STATE } from '../../shared/types/interviewTypes'
import { parseResumeFile } from '../resume/resumeParsers'
import { buildDeepSeekMessages } from '../../shared/ai/prompts'
import { streamDeepSeekChatCompletions } from '../../shared/ai/deepseekClient'
import type { QuestionOnlyOutput } from '../../shared/types/interviewTypes'

type InterviewStatus = 'Idle' | 'Ready' | 'Running' | 'Ended'

type TurnRecord = {
  question_type: QuestionType
  question: string
  userAnswer: string
  evaluation: TurnEvaluation
  nextQuestion: { question_type: QuestionType; question: string }
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

function toRecentTurns(turns: TurnRecord[], limit: number) {
  const slice = turns.slice(-limit)
  return slice.map((t) => ({
    question_type: t.question_type,
    question: t.question,
    userAnswer: t.userAnswer,
  }))
}

function buildResumeSegmentsPreview(segments: string[]) {
  return segments.slice(0, 8).join('\n\n')
}

export function useInterviewController() {
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>('Idle')
  const [resume, setResume] = useState<ResumeState>({
    status: 'none',
    displaySegments: [],
    resumeSummary: '',
  })

  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>('TECHNICAL')
  const [coverageState, setCoverageState] = useState<CoverageState>({ ...EMPTY_COVERAGE_STATE })

  const [turns, setTurns] = useState<TurnRecord[]>([])
  const [isBusy, setIsBusy] = useState(false)

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [switchModalOpen, setSwitchModalOpen] = useState(false)
  const [switchModalMode, setSwitchModalMode] = useState<'switch' | 'end'>('end')
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null)

  const canAnswer =
    interviewStatus === 'Running' && resume.status === 'ready' && currentQuestion.trim().length > 0 && !isBusy
  const canSummary = turns.length > 0

  const resetConversation = () => {
    setMessages([])
    setCurrentQuestion('')
    setCurrentQuestionType('TECHNICAL')
    setTurns([])
    setCoverageState({ ...EMPTY_COVERAGE_STATE })
  }

  const inferFileKind = (file: File): 'pdf' | 'docx' | null => {
    const name = file.name.toLowerCase()
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      return 'docx'
    }
    return null
  }

  const loadResumeAndStart = async (file: File) => {
    const kind = inferFileKind(file)
    if (!kind) {
      throw new Error('不支持的文件类型：仅支持 PDF 或 DOCX')
    }

    // 更新预览用 object URL（需要 revoke 旧的避免内存泄漏）
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const nextUrl = URL.createObjectURL(file)
    objectUrlRef.current = nextUrl

    setResume((prev) => ({ ...prev, status: 'parsing', error: undefined }))
    const parsed = await parseResumeFile(file)
    setResume({
      status: 'ready',
      fileName: parsed.fileName,
      fileKind: kind,
      fileUrl: nextUrl,
      rawText: parsed.rawText,
      displaySegments: parsed.displaySegments,
      resumeSummary: parsed.resumeSummary,
    })
    resetConversation()
    setInterviewStatus('Running')
    await askFirstQuestion({
      parsedSegmentsPreview: buildResumeSegmentsPreview(parsed.displaySegments),
      coverageForModel: { ...EMPTY_COVERAGE_STATE },
    })
  }

  const askFirstQuestion = async ({
    parsedSegmentsPreview,
    coverageForModel,
  }: {
    parsedSegmentsPreview: string
    coverageForModel?: CoverageState
  }) => {
    const msgId = uid()
    const streamingMessage: ChatMessage = {
      id: msgId,
      role: 'assistant',
      content: '',
      stage: 'question_only',
    }
    setMessages((prev) => [...prev, streamingMessage])

    setIsBusy(true)
    try {
      const messagesForModel = buildDeepSeekMessages({
        stage: 'question_only',
        resumeSummary: resume.resumeSummary,
        resumeSegmentsPreview: parsedSegmentsPreview,
        coverageState: coverageForModel ?? coverageState,
      })

      const res = await streamDeepSeekChatCompletions<QuestionOnlyOutput>({
        messages: messagesForModel,
        onDeltaContent: (delta) => {
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: m.content + delta } : m)))
        },
      })

      const parsed = res.parsed
      if (!parsed || parsed.stage !== 'question_only') {
        throw new Error(res.error ?? 'Model returned invalid JSON for question_only')
      }

      setCurrentQuestionType(parsed.question_type)
      setCurrentQuestion(parsed.question)
      setCoverageState((prev) => ({
        ...prev,
        [parsed.question_type]: prev[parsed.question_type] + 1,
      }))

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                parsed,
                content: parsed.question, // 解析完成后替换成可读文本
              }
            : m,
        ),
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : '模型调用失败'
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: `模型调用失败：${message}` } : m)))
      setCurrentQuestion('')
    } finally {
      setIsBusy(false)
    }
  }

  const onFileSelected = async (file: File) => {
    if (interviewStatus === 'Running') {
      setSwitchModalMode('switch')
      setPendingResumeFile(file)
      setSwitchModalOpen(true)
      return
    }

    try {
      setIsBusy(true)
      await loadResumeAndStart(file)
    } catch (e) {
      const message = e instanceof Error ? e.message : '解析失败'
      setResume((prev) => ({ ...prev, status: 'error', error: message }))
      setInterviewStatus('Idle')
    } finally {
      setIsBusy(false)
    }
  }

  const endInterview = async (withSummary: boolean) => {
    setSwitchModalOpen(false)
    setIsBusy(true)
    try {
      if (withSummary) {
        await generateSummary()
      }
      setInterviewStatus('Ended')
    } finally {
      setIsBusy(false)
    }
  }

  const generateSummary = async () => {
    setSummaryLoading(true)
    setSummaryOpen(true)
    setSummaryResult(null)
    setSummaryError(null)

    const msgId = uid()
    // 这里不把“模型输出”直接塞进 chat，直接弹窗展示；但仍复用 streaming 能力
    void msgId

    try {
      const recentEvaluations = turns.slice(-6).map((t) => ({
        question_type: t.question_type,
        question: t.question,
        evaluation: t.evaluation,
      }))

      const messagesForModel = buildDeepSeekMessages({
        stage: 'summary',
        resumeSummary: resume.resumeSummary,
        recentEvaluations,
      })

      const res = await streamDeepSeekChatCompletions<SummaryResult>({
        messages: messagesForModel,
      })
      if (res.parsed?.stage !== 'summary') {
        throw new Error(res.error ?? 'Model returned invalid JSON for summary')
      }

      setSummaryResult(res.parsed)
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成总结失败'
      setSummaryError(message)
    } finally {
      setSummaryLoading(false)
    }
  }

  const askNextWithEvaluation = async (userAnswer: string) => {
    if (interviewStatus !== 'Running') return

    const currentQuestionSnapshot = currentQuestion
    const currentQuestionTypeSnapshot = currentQuestionType

    const msgId = uid()
    const streamingMessage: ChatMessage = {
      id: msgId,
      role: 'assistant',
      content: '',
      stage: 'evaluation_with_next_question',
    }
    setMessages((prev) => [...prev, streamingMessage])

    setIsBusy(true)
    try {
      const recentTurns = toRecentTurns(turns, 3)

      const messagesForModel = buildDeepSeekMessages({
        stage: 'evaluation_with_next_question',
        resumeSummary: resume.resumeSummary,
        coverageState,
        currentQuestionType: currentQuestionTypeSnapshot,
        currentQuestion: currentQuestionSnapshot,
        userAnswer,
        recentTurns,
      })

      const res = await streamDeepSeekChatCompletions<EvaluationWithNextQuestionOutput>({
        messages: messagesForModel,
        onDeltaContent: (delta) => {
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: m.content + delta } : m)))
        },
      })

      const parsed = res.parsed
      if (!parsed || parsed.stage !== 'evaluation_with_next_question') {
        throw new Error(res.error ?? 'Model returned invalid JSON for evaluation_with_next_question')
      }

      const evaluation = parsed.evaluation
      const nextQuestion = parsed.next_question

      setTurns((prev) => [
        ...prev,
        {
          question_type: currentQuestionTypeSnapshot,
          question: currentQuestionSnapshot,
          userAnswer,
          evaluation,
          nextQuestion: { question_type: nextQuestion.question_type, question: nextQuestion.question },
        },
      ])

      // 当前题型计数 +1（当前题型=本轮被评估的 question_type）
      setCoverageState((prev) => ({
        ...prev,
        [parsed.question_type]: prev[parsed.question_type] + 1,
      }))

      setCurrentQuestionType(nextQuestion.question_type)
      setCurrentQuestion(nextQuestion.question)

      // 更新流式消息为结构化结果（UI 将切换为评分卡片）
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                parsed,
                content: `${evaluation.total_score}分`,
              }
            : m,
        ),
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : '模型调用失败'
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: `模型调用失败：${message}` } : m)))
      setCurrentQuestion('')
    } finally {
      setIsBusy(false)
    }
  }

  const onSubmitAnswer = async (answer: string) => {
    if (!canAnswer) return
    await askNextWithEvaluation(answer)
  }

  const onClickSummary = async () => {
    if (turns.length === 0) return
    await generateSummary()
  }

  const onClickEndInterview = () => {
    if (interviewStatus !== 'Running') {
      setInterviewStatus('Ended')
      return
    }
    setSwitchModalMode('end')
    setSwitchModalOpen(true)
  }

  const onConfirmSwitchEndNoSummary = async () => {
    setSwitchModalOpen(false)
    const file = pendingResumeFile
    setPendingResumeFile(null)
    if (!file) return

    try {
      setIsBusy(true)
      await loadResumeAndStart(file)
    } finally {
      setIsBusy(false)
    }
  }

  const onConfirmSwitchEndAndSummary = async () => {
    setSwitchModalOpen(false)
    const file = pendingResumeFile
    setPendingResumeFile(null)
    if (!file) return

    setIsBusy(true)
    try {
      await generateSummary()
      // 生成总结后切换新简历并继续
      await loadResumeAndStart(file)
    } finally {
      setIsBusy(false)
    }
  }

  const onConfirmEndNoSummary = async () => {
    await endInterview(false)
  }

  const onConfirmEndWithSummary = async () => {
    await endInterview(true)
  }

  const switchModalActions = useMemo(() => {
    return {
      onCancel: () => setSwitchModalOpen(false),
      onConfirmEndAndNoSummary: () => {
        if (switchModalMode === 'switch') return onConfirmSwitchEndNoSummary()
        return onConfirmEndNoSummary()
      },
      onConfirmEndAndSummary: () => {
        if (switchModalMode === 'switch') return onConfirmSwitchEndAndSummary()
        return onConfirmEndWithSummary()
      },
    }
  }, [switchModalMode]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    interviewStatus,
    resume,
    messages,
    currentQuestion,
    currentQuestionType,
    coverageState,
    canAnswer,
    canSummary,
    isBusy,
    onFileSelected,
    onSubmitAnswer,
    onClickSummary,
    onClickEndInterview,
    summaryOpen,
    summaryLoading,
    summaryResult,
    summaryError,
    setSummaryOpen,
    switchModalOpen,
    switchModalMode,
    ...switchModalActions,
  }
}

