export type InterviewSessionStatus = "active" | "completed"

export type InterviewMessageRole = "assistant" | "user" | "system"

export type InterviewSession = {
  id: string
  projectId: string
  status: InterviewSessionStatus
  currentStage: string
  summary?: string
  createdAt: Date
  updatedAt: Date
}

export type InterviewMessage = {
  id: string
  sessionId: string
  role: InterviewMessageRole
  content: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

