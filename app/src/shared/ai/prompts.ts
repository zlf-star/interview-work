import type {
  CoverageState,
  QuestionType,
  InterviewStage,
} from '../types/interviewTypes'

export type BuildPromptArgs =
  | {
      stage: 'question_only'
      resumeSummary: string
      resumeSegmentsPreview?: string
      coverageState: CoverageState
    }
  | {
      stage: 'evaluation_with_next_question'
      resumeSummary: string
      coverageState: CoverageState
      currentQuestionType: QuestionType
      currentQuestion?: string
      userAnswer: string
      recentTurns: Array<{
        question_type?: QuestionType
        question?: string
        userAnswer?: string
      }>
    }
  | {
      stage: 'summary'
      resumeSummary: string
      recentEvaluations: Array<unknown>
    }

const SYSTEM_PROMPT = `
你是面试官 + 评估官。
你必须基于候选人的简历与回答进行面试提问、评分与反馈。

强约束：
1) 最终输出必须是严格 JSON（不包含任何额外的解释文字、markdown、前后缀）。
2) JSON 结构的 stage 字段必须匹配请求的 stage。
3) 所有评分必须在对应范围内：scores 中每一项为 0-10 的数字，total_score 必须为 0-100 的数字。
4) 语言默认使用中文。

如果信息不足，仍需输出，但应在 weaknesses/improvements 中明确指出“缺少依据/需要补充”。`

function formatCoverage(coverageState: CoverageState) {
  return Object.entries(coverageState)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

export function buildDeepSeekMessages(args: BuildPromptArgs) {
  const userBase = `简历摘要（用于生成与评估）：\n${args.resumeSummary}\n`

  if (args.stage === 'question_only') {
    return [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content:
          `${userBase}\n` +
          `简历原文分段预览（可选）：\n${args.resumeSegmentsPreview ?? '(未提供)'}\n\n` +
          `当前四类题型覆盖计数（用于选择下一题类型）：\n${formatCoverage(args.coverageState)}\n\n` +
          `任务：只输出一题（question_only），question_type 需要在四类中选择，确保与简历内容高度相关。` +
          `输出必须是严格 JSON，并包含 answering_guidance（数组，给出答题要点，可为空数组）。`,
      },
    ]
  }

  if (args.stage === 'evaluation_with_next_question') {
    const stage: InterviewStage = 'evaluation_with_next_question'
    void stage
    return [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content:
          `${userBase}\n` +
          `当前题型：${args.currentQuestionType}\n` +
          `用户回答：\n${args.userAnswer}\n\n` +
          `覆盖计数（用于选择 next_question.question_type）：\n${formatCoverage(args.coverageState)}\n\n` +
          `最近回合（最小化上下文）：\n${JSON.stringify(args.recentTurns)}\n\n` +
          `任务：请对本轮回答进行分析与评分（evaluation），然后在同一次输出中给出 next_question（next_question.question_type 与 question）。` +
          `输出必须是严格 JSON，stage 字段为 "evaluation_with_next_question"。` +
          `evaluation.scores 每项必须为 0-10，evaluation.total_score 必须为 0-100。`,
      },
    ]
  }

  // summary
  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content:
        `${userBase}\n` +
        `候选人历史评估（最近若干轮的结构化评分）：\n${JSON.stringify(
          args.recentEvaluations,
        )}\n\n` +
        `任务：输出 interview 总结（stage="summary"），包含 overall_assessment、mastery_points、weakness_points、recommended_study_plan、interview_strategy。` +
        `输出必须是严格 JSON。`,
    },
  ]
}

