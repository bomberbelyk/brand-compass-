# Implementation Roadmap

This roadmap turns the MVP technical plan into short implementation phases.

The goal is to reach a working vertical slice quickly, then improve depth and reliability.

## Phase 0. Current State

Completed:

- product brief
- interviewer personality
- readiness criteria
- lean prototype decisions
- interview engine spec
- interview state spec
- MVP technical plan
- Supabase schema spec
- difficult client simulator prompt

## Phase 1. Initialize App

Goal:

- create the runnable Next.js product shell.

Tasks:

- initialize Next.js in the repo
- configure TypeScript
- configure Tailwind
- add base layout
- add environment variables
- install Anthropic SDK
- install Supabase libraries
- keep first screen as product chat, not landing page

Done when:

- app runs locally
- first chat screen renders
- environment variables are documented

## Phase 2. Supabase Connection

Goal:

- connect the app to Supabase and create the core tables.

Tasks:

- create Supabase project
- apply schema from `docs/architecture/supabase-schema.md`
- seed default owner
- create Supabase server helper
- define local TypeScript types for session/message rows

Done when:

- API route can read seeded owner
- app can create a `client_sessions` row

## Phase 3. Email Code Flow

Goal:

- let a client start or resume through email without password auth.

Tasks:

- create `POST /api/auth/request-code`
- create `POST /api/auth/verify-code`
- generate 6-digit dev code
- expire codes after 10 minutes
- show dev code when `DEV_SHOW_EMAIL_CODE=true`
- create or resume latest session after verification

Done when:

- client enters email
- client enters code
- new session is created or previous session is resumed

## Phase 4. Chat Persistence

Goal:

- persist the raw transcript.

Tasks:

- create chat UI state
- save user message to `interview_messages`
- save assistant message to `interview_messages`
- reload transcript on resume
- update `last_activity_at`

Done when:

- refresh does not lose messages
- returning client sees previous conversation context

## Phase 5. First Anthropic Interview Loop

Goal:

- get a real interviewer response from Anthropic.

Tasks:

- create `aiService`
- create `interviewService`
- create initial interviewer prompt
- include working context Markdown
- generate one question at a time
- save assistant response

Done when:

- client can answer the first project question
- AI responds with a useful next question
- answer is saved

## Phase 6. Analysis And State Update

Goal:

- update context and JSON state after each client answer.

Tasks:

- create `analysisService`
- create `contextService`
- call Haiku for extraction
- update `state_json`
- update `working_context_markdown`
- create `context_snapshots`
- calculate early readiness

Done when:

- owner/admin can see facts extracted from conversation
- readiness score changes after answers
- context Markdown remains readable

## Phase 7. Owner Admin View

Goal:

- let the owner monitor interviews.

Tasks:

- create owner route, for example `/owner/default`
- list sessions
- show status, client email/name, last activity
- show readiness level and score
- show important open questions
- show session detail
- show transcript
- show working context Markdown

Done when:

- owner can see active, paused, and completed sessions
- owner can inspect a session without touching the database

## Phase 8. Early Brief Moment

Goal:

- make the interviewer invite the client to continue without feeling like a form.

Tasks:

- detect when stages 1-6 have enough raw material
- generate "we can already draft a brief, but..." message
- surface 1-2 high-impact missing points
- allow client to continue or finish

Done when:

- after a short interview, the AI can explain what is captured and what is still important
- client can choose to continue or generate a raw brief

## Phase 9. Client Brief Generation

Goal:

- generate the primary MVP output.

Tasks:

- create `documentService`
- generate Client Brief from working context + state + transcript excerpts
- mark unknowns as open questions
- mark delegated decisions
- store Markdown in `generated_documents`
- show document in owner view

Done when:

- owner can generate and view a Client Brief
- incomplete data is not hidden

## Phase 10. Incomplete Session Follow-Up

Goal:

- support human-in-the-loop recovery when the client leaves.

Tasks:

- detect stale sessions manually or by endpoint
- generate owner follow-up draft
- include concrete unfinished points
- store in `owner_followups`
- show draft in owner admin

Done when:

- owner can see a suggested email for an incomplete session
- no raw brief is automatically sent to the client

## Phase 11. Email Sending

Goal:

- send final brief to client and owner.

Tasks:

- choose simple email provider
- send Client Brief email
- send owner-approved follow-up email
- mark documents/followups as sent

Done when:

- completed Client Brief can be sent to both client and owner
- incomplete follow-up can be sent only after owner action

## Phase 12. Demo Validation

Goal:

- test the product against five realistic scenarios.

Tasks:

- use `docs/mvp/demo-scenarios.md`
- use `docs/mvp/difficult-client-simulator-prompt.md`
- run each scenario through the interview
- compare output quality
- log where interviewer felt annoying, vague, or too passive
- update prompts and readiness rules

Done when:

- all five scenarios produce a usable Client Brief or a clearly useful incomplete-session follow-up

## Suggested Build Order

Build in this order:

1. Phases 1-4: working persisted chat.
2. Phase 5: real AI interviewer.
3. Phase 6: state/context intelligence.
4. Phase 7: owner visibility.
5. Phases 8-10: brief and follow-up loop.
6. Phase 12: demo validation.
7. Phase 11: real email sending.

Reason:

- the product becomes testable as soon as chat, storage, AI, and owner visibility exist.

## First Milestone

The first milestone should be:

```text
Client can enter email, verify dev code, answer the first interview question, receive an AI follow-up, and owner can see the session in admin.
```

This is the smallest version that proves the architecture is alive.

