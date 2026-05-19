# MVP Technical Plan

This plan describes the first technical implementation of the Request Architect lean prototype.

The goal is to build the smallest working product that can test the core hypothesis:

Can an AI interviewer help a vague client produce a useful working brief better than a static intake form?

## 1. Final Prototype Stack

## App

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vercel deployment

## AI

- Anthropic API
- Sonnet for main interview responses and final Client Brief generation
- Haiku for extraction, clarity updates, context compaction, and readiness pre-checks

## Data

- Supabase PostgreSQL for working product state
- Markdown snapshots stored in database for transcript/context/brief
- GitHub markdown archive is optional later, not required for the first build

## Auth

- no password accounts
- email-based session start
- simulated email code in the prototype
- real email delivery later

## Languages

- Ukrainian default UI
- interview language auto-detected from user replies
- Ukrainian and English as official document output languages
- Russian can be supported in the interview through auto-detection, but not as an official document language for MVP

## 2. Core Data Model

Detailed SQL schema:

- `docs/architecture/supabase-schema.md`

## owners

Represents the freelancer, agency, or operator who owns the interview link.

Fields:

- `id`
- `email`
- `name`
- `link_slug`
- `created_at`
- `updated_at`

Prototype note:

- this can start with one seeded owner
- full owner auth can be deferred

## client_sessions

Represents one client interview session.

Fields:

- `id`
- `owner_id`
- `client_email`
- `client_name`
- `status`: `email_pending | code_pending | active | paused | completed | abandoned`
- `detected_language`: `uk | en | ru | other`
- `document_language`: `uk | en | auto`
- `current_stage`
- `inferred_project_type`
- `initial_request`
- `working_context_markdown`
- `state_json`
- `readiness_level`
- `readiness_score`
- `last_activity_at`
- `created_at`
- `updated_at`

## verification_codes

Stores simulated email codes for the prototype.

Fields:

- `id`
- `email`
- `code`
- `expires_at`
- `consumed_at`
- `created_at`

Prototype behavior:

- code can be returned in the API response or shown in dev UI
- later this table supports real email delivery

## interview_messages

Stores the full raw transcript.

Fields:

- `id`
- `session_id`
- `role`: `system | assistant | user`
- `content`
- `hidden`
- `metadata_json`
- `created_at`

## context_snapshots

Stores versioned working context Markdown and structured state snapshots.

Fields:

- `id`
- `session_id`
- `context_markdown`
- `state_json`
- `created_at`

Use:

- debugging
- recovery
- comparing context evolution
- possible rollback

## generated_documents

Stores generated Client Briefs and later document variants.

Fields:

- `id`
- `session_id`
- `type`: `client_brief | raw_brief | owner_follow_up`
- `language`
- `title`
- `content_markdown`
- `status`: `draft | ready | sent`
- `created_at`
- `updated_at`

## owner_followups

Stores incomplete-session follow-up drafts for owner review.

Fields:

- `id`
- `session_id`
- `owner_id`
- `client_email`
- `subject`
- `body_markdown`
- `status`: `draft | sent | discarded`
- `created_at`
- `updated_at`

## 3. API Routes

## Client Session

```text
POST /api/auth/request-code
POST /api/auth/verify-code
GET /api/sessions/current
POST /api/sessions/:id/message
POST /api/sessions/:id/pause
POST /api/sessions/:id/complete
```

## AI/Internal

```text
POST /api/sessions/:id/analyze
POST /api/sessions/:id/generate-brief
POST /api/sessions/:id/generate-follow-up
```

These may start as internal service calls from `/message` instead of public routes.

## Owner/Admin

```text
GET /api/owner/sessions
GET /api/owner/sessions/:id
POST /api/owner/sessions/:id/send-brief
POST /api/owner/sessions/:id/send-follow-up
```

Email sending can be mocked in the first build.

## 4. Server Services

## authService

Responsibilities:

- create simulated email code
- verify email code
- create or resume session by email

## sessionService

Responsibilities:

- create client session
- resume latest active session
- update status
- update current stage
- update last activity

## messageService

Responsibilities:

- save user messages
- save assistant messages
- load transcript
- create transcript Markdown

## aiService

Responsibilities:

- call Anthropic
- choose model
- isolate provider-specific code
- prepare prompts

## analysisService

Responsibilities:

- analyze latest answer
- extract facts
- detect language
- update clarity areas
- detect vague terms
- detect contradictions
- update readiness pre-check

Model:

- Haiku by default
- Sonnet when contradictions or ambiguous tradeoffs are present

## contextService

Responsibilities:

- maintain working context Markdown
- update structured JSON state
- create context snapshots
- keep context compact enough for future AI calls

## interviewService

Responsibilities:

- decide next stage
- generate next question
- handle "I don't know"
- handle client wants to finish
- create early brief moment
- coordinate analysis, context update, and interviewer response

Model:

- Sonnet for main interviewer response

## documentService

Responsibilities:

- generate raw brief
- generate Client Brief
- generate owner follow-up draft
- store Markdown document
- prepare future PDF export

Model:

- Sonnet for final Client Brief
- Haiku may prepare supporting summaries

## ownerService

Responsibilities:

- list sessions
- show session status
- show open questions
- show readiness
- show generated documents
- support owner review before sending

## 5. First Vertical Slice

The first build should prove the full loop with minimal polish.

## User Flow

1. Client opens owner link.
2. Chat asks for email.
3. Client enters email.
4. System generates simulated code.
5. Client enters code.
6. System creates or resumes session.
7. If new, chat asks for name.
8. Chat asks what the client wants to order or create.
9. Client answers.
10. Message is saved.
11. Haiku analyzes the answer.
12. Context Markdown and JSON state are updated.
13. Sonnet generates the next interviewer response.
14. Assistant message is saved.
15. Owner admin shows the session and latest status.

## Acceptance Criteria

The vertical slice is done when:

- email-code flow works in dev mode
- session persists in Supabase
- raw messages are saved
- latest session can be resumed by email
- Anthropic response appears in chat
- context Markdown updates after a user answer
- JSON state updates after a user answer
- owner sessions list shows the session
- owner session detail shows transcript, context, readiness, and open questions

## 6. Implementation Order

## Step 1. Project Setup

- initialize Next.js app in the repo
- configure TypeScript
- configure Tailwind
- add environment variable examples
- install Anthropic SDK
- install Supabase client/server libraries

## Step 2. Supabase Schema

- create SQL schema for MVP tables
- add seed owner
- create local types
- add database helper

## Step 3. Email Code Flow

- request code
- verify code
- create/resume session
- display dev code safely in prototype UI

## Step 4. Chat UI

- single product screen
- message list
- textarea
- loading state
- language-friendly copy
- no landing page

## Step 5. Message Persistence

- save user messages
- save assistant messages
- reload session transcript
- resume latest active session

## Step 6. AI Interview Loop

- build interviewer prompt
- call Anthropic Sonnet
- return one question at a time
- handle current context

## Step 7. Analysis Loop

- build answer analysis prompt
- call Haiku
- update JSON state
- update context Markdown
- create context snapshot

## Step 8. Owner Admin

- list sessions
- show status and readiness
- show transcript
- show context Markdown
- show open questions

## Step 9. Raw Brief And Client Brief

- generate raw brief from incomplete session
- generate Client Brief from working context and state
- store Markdown

## Step 10. Owner Follow-Up Draft

- detect abandoned/paused session
- generate follow-up draft
- show draft in owner admin

## 7. Environment Variables

```text
ANTHROPIC_API_KEY=
ANTHROPIC_INTERVIEW_MODEL=
ANTHROPIC_ANALYSIS_MODEL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=http://localhost:3000
DEV_SHOW_EMAIL_CODE=true
```

Recommended model defaults:

```text
ANTHROPIC_INTERVIEW_MODEL=claude-sonnet-4-6
ANTHROPIC_ANALYSIS_MODEL=claude-haiku-4-5
```

Exact model IDs should be verified in Anthropic docs before implementation.

## 8. Risks

## Context Drift

Risk:

- working context may gradually diverge from transcript

Mitigation:

- raw transcript remains source of truth
- create context snapshots
- periodically regenerate context from transcript if needed

## Cost Growth

Risk:

- using Sonnet for every task may become expensive

Mitigation:

- Haiku for extraction and state updates
- compact context
- only send relevant transcript slices

## User Drop-Off

Risk:

- clients leave before enough information is collected

Mitigation:

- early brief moment
- owner-reviewed follow-up draft
- always save progress

## Weak Briefs

Risk:

- generated briefs may look polished while still incomplete

Mitigation:

- mark open questions clearly
- include delegated decisions
- show readiness and missing points

## 9. Non-Goals For First Build

- full SaaS auth
- billing
- public landing page
- PDF polish
- multi-owner permissions
- template marketplace
- integrations
- white label
- bilingual documents
