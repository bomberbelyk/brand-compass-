export type ClarityAreaKey =
  | "goal"
  | "audience"
  | "business_context"
  | "style"
  | "references"
  | "budget"
  | "timeline"
  | "constraints"
  | "stakeholders"
  | "acceptance_criteria"
  | "risks"
  | "scope"
  | "technical_requirements"

export type ClarityStatus = "clear" | "partial" | "weak" | "missing" | "conflict"

export type ClarityArea = {
  id: string
  projectId: string
  area: ClarityAreaKey
  status: ClarityStatus
  score: number
  notes?: string
  updatedAt: Date
}

