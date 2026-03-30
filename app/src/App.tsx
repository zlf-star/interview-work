import './App.css'
import ResumeUploader from './features/resume/ResumeUploader'
import ResumeViewer from './features/resume/ResumeViewer'
import InterviewChat from './features/interview/InterviewChat'
import ResumeSwitchModal from './features/interview/ResumeSwitchModal'
import SummaryModal from './features/interview/SummaryModal'
import { useInterviewController } from './features/interview/useInterviewController'

export default function App() {
  const controller = useInterviewController()

  const {
    resume,
    messages,
    currentQuestion,
    currentQuestionType,
    canAnswer,
    isBusy,
    onFileSelected,
    onSubmitAnswer,
    onClickSummary,
    canSummary,
    summaryOpen,
    summaryLoading,
    summaryResult,
    summaryError,
    setSummaryOpen,
    switchModalOpen,
    switchModalMode,
    onCancel,
    onConfirmEndAndNoSummary,
    onConfirmEndAndSummary,
  } = controller

  return (
    <div className="appShell">
      <div className="topBar">
        <div className="topBarTitle">AI 简历模拟面试助手</div>

        <div className="topBarActions">
          <ResumeUploader
            disabled={isBusy}
            buttonText={resume.status === 'ready' ? '更换简历' : '选择简历'}
            onFileSelected={onFileSelected}
          />

          <button
            className="btn"
            disabled={!canSummary || isBusy}
            onClick={() => onClickSummary()}
          >
            总结
          </button>

          <button className="btn" disabled={isBusy} onClick={controller.onClickEndInterview}>
            结束面试
          </button>
        </div>
      </div>

      <div className="mainGrid">
        <aside className="resumePane">
          <div className="resumeHeader">
            <div>简历展示</div>
            <div className="hint">{resume.status === 'ready' ? '已加载' : '未开始'}</div>
          </div>
          <div className="resumeBody">
            <ResumeViewer resume={resume} />
          </div>
        </aside>

        <section className="chatPane">
          <InterviewChat
            messages={messages}
            currentQuestion={currentQuestion}
            currentQuestionType={currentQuestionType}
            canAnswer={canAnswer}
            isBusy={isBusy}
            onSubmitAnswer={onSubmitAnswer}
          />
        </section>
      </div>

      <ResumeSwitchModal
        open={switchModalOpen}
        mode={switchModalMode}
        onCancel={onCancel}
        onConfirmEndAndNoSummary={onConfirmEndAndNoSummary}
        onConfirmEndAndSummary={onConfirmEndAndSummary}
      />

      <SummaryModal
        open={summaryOpen}
        loading={summaryLoading}
        result={summaryResult}
        error={summaryError}
        onClose={() => setSummaryOpen(false)}
      />
    </div>
  )
}

