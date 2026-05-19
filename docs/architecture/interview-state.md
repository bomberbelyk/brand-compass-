# Interview State

The JSON state is a machine-readable snapshot of the current interview.

It should not replace the raw transcript or working context Markdown.

It powers:

- clarity map
- readiness status
- admin view
- next-question decisions
- incomplete-session follow-up
- document generation

## Suggested Shape

```ts
type InterviewState = {
  user: {
    email: string
    name?: string
    detectedLanguage: "uk" | "en" | "ru" | "other"
    documentLanguage: "uk" | "en" | "auto"
  }

  owner: {
    id: string
    email: string
    linkId: string
  }

  session: {
    id: string
    status: "email_pending" | "active" | "paused" | "completed" | "abandoned"
    currentStage:
      | "email"
      | "code"
      | "name"
      | "initial_request"
      | "business_context"
      | "desired_change"
      | "audience"
      | "expected_result"
      | "taste"
      | "scope"
      | "acceptance"
      | "risks"
      | "wrap_up"
    lastQuestion?: string
    lastActivityAt: string
    deferredQuestions: DeferredQuestion[]
  }

  project: {
    inferredType?:
      | "website"
      | "branding"
      | "presentation"
      | "marketing_campaign"
      | "digital_product"
      | "other"
      | "unknown"
    businessDescription?: string
    initialRequest?: string
    desiredChange?: string
  }

  facts: {
    goals: string[]
    audience: string[]
    deliverables: string[]
    constraints: string[]
    timeline?: string
    budget?: string
    stakeholders: string[]
    approvers: string[]
    acceptanceCriteria: string[]
    inScope: string[]
    outOfScope: string[]
    openQuestions: string[]
  }

  taste: {
    clientPhrases: string[]
    vagueTerms: VagueTerm[]
    references: ReferenceItem[]
    avoid: string[]
  }

  clarity: Record<ClarityAreaKey, ClarityAreaState>

  contradictions: ContradictionState[]

  delegatedDecisions: DelegatedDecision[]

  readiness: {
    level: "raw_request" | "early_brief" | "working_brief" | "production_brief"
    score: number
    canGenerateRawBrief: boolean
    canGenerateClientBrief: boolean
    blockingQuestions: string[]
    importantOpenQuestions: string[]
    recommendedNextQuestion?: string
    continuationHook?: string
  }

  outputs: {
    latestBriefId?: string
    ownerFollowUpDraftId?: string
    lastContextMarkdownId?: string
  }
}

type DeferredQuestion = {
  id: string
  area: ClarityAreaKey
  question: string
  reason: string
  returnAfterStage?: string
}

type VagueTerm = {
  term: string
  originalPhrase: string
  interpretedMeaning?: string
  status: "unexplained" | "partially_explained" | "explained"
}

type ReferenceItem = {
  label: string
  url?: string
  interpretation?: string
}

type ClarityAreaKey =
  | "goal"
  | "audience"
  | "business_context"
  | "desired_result"
  | "style"
  | "scope"
  | "constraints"
  | "timeline"
  | "budget"
  | "stakeholders"
  | "acceptance_criteria"
  | "risks"
  | "technical_requirements"

type ClarityAreaState = {
  status: "missing" | "weak" | "partial" | "clear" | "conflict"
  score: number
  evidence: string[]
  notes?: string
}

type ContradictionState = {
  title: string
  description: string
  severity: "low" | "medium" | "high"
  status: "open" | "resolved" | "accepted_tradeoff"
  evidence: string[]
  suggestedResolution?: string
}

type DelegatedDecision = {
  area: ClarityAreaKey
  decisionOwner: "contractor"
  clientApprovedDelegation: boolean
  note: string
}
```

## Most Important Fields For MVP

The MVP admin view needs:

- `user.email`
- `user.name`
- `session.status`
- `session.currentStage`
- `session.lastActivityAt`
- `project.inferredType`
- `project.initialRequest`
- `readiness.level`
- `readiness.score`
- `readiness.importantOpenQuestions`
- `readiness.continuationHook`

The interviewer needs:

- `facts`
- `taste`
- `clarity`
- `contradictions`
- `delegatedDecisions`
- `session.deferredQuestions`

The document generator needs:

- `facts`
- `taste`
- `contradictions`
- `delegatedDecisions`
- `readiness.importantOpenQuestions`
- working context Markdown

