export type GeneratedDocumentType =
  | "client_brief"
  | "creative_brief"
  | "technical_spec"
  | "scope_of_work"
  | "acceptance_criteria"
  | "risk_report"
  | "executive_summary"

export type GeneratedDocumentFormat = "markdown" | "html" | "pdf"

export type GeneratedDocument = {
  id: string
  projectId: string
  type: GeneratedDocumentType
  title: string
  content: string
  format: GeneratedDocumentFormat
  createdAt: Date
  updatedAt: Date
}

