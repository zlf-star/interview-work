export type QuestionType =
  | 'TECHNICAL'
  | 'SYSTEM_DESIGN'
  | 'BEHAVIORAL'
  | 'EXPERIENCE_DEEP_DIVE'

export const QUESTION_TYPES: QuestionType[] = [
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'BEHAVIORAL',
  'EXPERIENCE_DEEP_DIVE',
]

export type InterviewStage =
  | 'question_only'
  | 'evaluation_with_next_question'
  | 'summary'

export type ScoreScale = {
  relevance: number
  correctness: number
  coverage: number
  structure: number
  depth: number
  clarity: number
}

export type TurnEvaluation = {
  question_restate?: string
  scores: ScoreScale
  total_score: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  evaluation_notes?: string
}

export type NextQuestion = {
  question_type: QuestionType
  question: string
  answering_guidance?: string[]
}

export type QuestionOnlyOutput = {
  stage: 'question_only'
  question_type: QuestionType
  question: string
  answering_guidance?: string[]
}

export type EvaluationWithNextQuestionOutput = {
  stage: 'evaluation_with_next_question'
  current_question?: string
  question_type: QuestionType
  evaluation: TurnEvaluation
  next_question: NextQuestion
}

export type SummaryResult = {
  stage: 'summary'
  overall_assessment: string
  mastery_points: Array<{ point: string; evidence?: string }>
  weakness_points: Array<{ point: string; impact?: string }>
  recommended_study_plan: Array<{
    title: string
    actions: string[]
    timeframe?: string
  }>
  interview_strategy: string[]
}

export type ModelJsonOutput =
  | QuestionOnlyOutput
  | EvaluationWithNextQuestionOutput
  | SummaryResult

export type CoverageState = Record<QuestionType, number>

export type ChatRole = 'assistant' | 'user'

export type ChatMessage = {
  id: string
  role: ChatRole
  // content 用于流式渲染；解析完成后也可能会被替换为更结构化的数据展示
  content: string
  stage?: InterviewStage
  parsed?: ModelJsonOutput
}

export type ResumeState = {
  status: 'none' | 'parsing' | 'ready' | 'error'
  fileName?: string
  fileKind?: 'pdf' | 'docx' | null
  // 用于左侧渲染器（PDF/DOCX）预览
  fileUrl?: string | null
  rawText?: string
  displaySegments: string[]
  resumeSummary: string
  error?: string
}

export const EMPTY_COVERAGE_STATE: CoverageState = {
  TECHNICAL: 0,
  SYSTEM_DESIGN: 0,
  BEHAVIORAL: 0,
  EXPERIENCE_DEEP_DIVE: 0,
}

