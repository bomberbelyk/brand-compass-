# Data Model

## User

```ts
type User = {
  id: string
  email: string
  name?: string
  role: "client" | "freelancer" | "agency_manager" | "consultant" | "internal_requester"
  createdAt: Date
  updatedAt: Date
}
```

## Project

```ts
type Project = {
  id: string
  userId: string
  title: string
  projectType: "website" | "branding" | "presentation" | "marketing_campaign" | "digital_product"
  status: "draft" | "interviewing" | "ready" | "archived"
  interviewLanguage: "uk" | "en"
  documentLanguage: "uk" | "en"
  initialRequest: string
  maturityScore?: number
  createdAt: Date
  updatedAt: Date
}
```

## InterviewSession

```ts
type InterviewSession = {
  id: string
  projectId: string
  status: "active" | "completed"
  currentStage: string
  summary?: string
  createdAt: Date
  updatedAt: Date
}
```

## InterviewMessage

```ts
type InterviewMessage = {
  id: string
  sessionId: string
  role: "assistant" | "user" | "system"
  content: string
  metadata?: Record<string, any>
  createdAt: Date
}
```

## ClarityArea

```ts
type ClarityArea = {
  id: string
  projectId: string
  area:
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
  status: "clear" | "partial" | "weak" | "missing" | "conflict"
  score: number
  notes?: string
  updatedAt: Date
}
```

## Contradiction

```ts
type Contradiction = {
  id: string
  projectId: string
  title: string
  description: string
  severity: "low" | "medium" | "high"
  suggestedResolution: string
  createdAt: Date
}
```

## GeneratedDocument

```ts
type GeneratedDocument = {
  id: string
  projectId: string
  type:
    | "client_brief"
    | "creative_brief"
    | "technical_spec"
    | "scope_of_work"
    | "acceptance_criteria"
    | "risk_report"
    | "executive_summary"
  title: string
  content: string
  format: "markdown" | "html" | "pdf"
  createdAt: Date
  updatedAt: Date
}
```
