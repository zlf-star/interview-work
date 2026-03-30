import { useRef } from 'react'

export type ResumeUploaderProps = {
  disabled?: boolean
  buttonText?: string
  onFileSelected: (file: File) => void
}

export default function ResumeUploader({
  disabled,
  buttonText = '选择简历',
  onFileSelected,
}: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
        disabled={disabled}
      />
      <button
        className="btn btnPrimary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {buttonText}
      </button>
    </>
  )
}

