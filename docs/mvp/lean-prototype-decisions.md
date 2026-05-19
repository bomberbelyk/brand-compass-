# Lean Prototype Decisions

This document captures MVP decisions for the first lean prototype.

## Product Shape

The first MVP is a lean interview prototype, not a full SaaS dashboard.

The product starts as a guided interview. The user should not feel that they are filling out a long setup form.

The interview collects:

- user name
- project language
- document language
- project type
- initial request
- role and context
- goal
- audience
- scope
- constraints
- stakeholders
- acceptance criteria
- open questions

Most project setup should happen conversationally.

## Authentication

No password-based authentication in the prototype.

The user starts by entering email.

The prototype simulates a one-time email code.

If the user returns and verifies the same email, the system should find previous sessions and continue from the saved context.

Later versions may add:

- client links
- project owner accounts
- agency workspaces

## First ICP

The first ICP is:

- freelancer
- small agency

The agency or freelancer sends a link to the client. The client answers the interview independently.

The interviewer should explain, guide, and help the client make decisions.

An owner link/admin view is required in the prototype so the freelancer or agency can see interview statuses and review incomplete sessions.

## Data Storage

Prototype options:

1. Supabase PostgreSQL
2. local file-based Markdown storage
3. SQLite

Recommended path:

- use Supabase PostgreSQL if the prototype will be tested by real external users
- use Markdown files only for very early local development

Supabase is likely the best prototype choice because it provides hosted PostgreSQL, simple tables, and an easy migration path to Prisma/PostgreSQL later.

## AI Provider

Primary AI provider:

- Anthropic API

Future-proofing:

- keep an internal AI service interface so OpenAI or another compatible provider can be added later

## Model Split

Use stronger models for high-judgment tasks and cheaper models for structured support tasks.

Suggested split:

- Sonnet: main interviewer response
- Sonnet: contradiction resolution and final brief generation
- Haiku: answer extraction
- Haiku: clarity map update
- Haiku: lightweight summary compaction
- Haiku: readiness pre-check

If cost becomes an issue, run Haiku first and call Sonnet only when:

- the next question requires nuance
- contradictions are present
- the user wants to finish early
- final document generation starts

## Context Strategy

The system should maintain a living project context, not rely only on the raw chat transcript.

Recommended structure:

- raw transcript
- working context Markdown
- structured JSON state

The raw transcript is the source of truth.

The working context Markdown is a human-readable evolving summary.

The structured JSON state powers clarity map, readiness checks, and document generation.

Each user answer should trigger:

1. save raw message
2. analyze answer
3. update structured state
4. append/update working context Markdown
5. generate next interviewer response

## Language

Default interface language:

- Ukrainian

Official document languages:

- Ukrainian
- English

Interview language is auto-detected from the client's replies.

Russian may be supported in the interview through auto-detection, but documents are officially generated in Ukrainian or English for MVP.

Document language is generated from the client's language where possible, with Ukrainian and English as the primary supported output languages.

Bilingual documents are not required for MVP.

English terms may remain in Ukrainian documents when this is natural or clearer.

## Interview Depth

The interview should start simple.

The client should not see complexity upfront.

The interviewer should:

- ask easy grounding questions first
- keep one question per turn
- avoid showing a long checklist at the beginning
- near the end, show what important areas remain unclear
- invite the client to continue now or later

The interview should support unfinished sessions.

If the client leaves, the system should still save:

- transcript
- working context Markdown
- clarity state
- open questions

The system should not automatically send a raw brief to the client after window close.

Instead, it should generate an owner-reviewed follow-up draft that explains which concrete points remain unfinished and invites the client to continue.

An unfinished session can still produce a raw brief with missing points clearly marked.

## Document Scope

MVP primary document:

- Client Brief

If enough information exists, the Client Brief may include compressed sections for:

- Scope of Work
- Acceptance Criteria
- Risks
- Open Questions

Separate Scope of Work and Acceptance Criteria documents are optional after the first prototype.

All generated content should be saved in Markdown.

PDF can be generated on request using a simple HTML-to-PDF flow.

Final Client Brief email is sent to both:

- client
- owner

Incomplete-session follow-up is drafted for the owner and sent only after owner review.

## Unknown Answers

If the client answers "I don't know", the interviewer should not block the flow.

It should explain the consequence:

```text
If we leave this open, the contractor will need to make this decision. That can be fine, but it means you are agreeing to trust their judgment here.
```

Then offer options:

- decide now
- choose from suggested options
- leave to contractor
- mark as open question

This should make delegation explicit rather than accidental.
