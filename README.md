# Request Architect

Request Architect is an AI-powered briefing platform for service businesses.

It helps clients transform vague project ideas into structured, actionable project briefs through an adaptive interview. The system asks clarifying questions, detects vague language, identifies contradictions, scores the maturity of the request, and generates professional documents such as a client brief, creative brief, scope of work, acceptance criteria, and risk report.

The product is designed for designers, agencies, consultants, marketers, no-code developers, and internal teams that need better project intake and clearer client requirements.

## MVP Focus

The first version should prove one core hypothesis:

If an AI interviewer helps clients formulate requests better than a static form, freelancers and agencies will pay for fewer discovery calls, fewer chaotic revisions, and clearer expectations.

The MVP focuses on:

- AI interview
- clarity map
- high-quality generated brief

## Suggested Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- PostgreSQL
- OpenAI API or compatible LLM API

## Repository Map

- `docs/product` - product brief, audience, scenarios, monetization
- `docs/architecture` - system architecture, data model, decisions
- `docs/mvp` - implementation phases, MVP scope, backlog
- `docs/ai` - interview prompts and AI behavior contracts
- `docs/api` - API routes and request/response notes
- `src/app` - Next.js app routes and API routes
- `src/components` - UI and domain components
- `src/lib` - shared app utilities
- `src/server/services` - domain service layer
- `src/types` - TypeScript domain types
- `src/config` - project types, interview stages, pricing
- `prisma` - database schema and migrations
- `tests` - unit, integration, and end-to-end tests

