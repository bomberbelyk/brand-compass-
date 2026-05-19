# Architecture Overview

## Frontend

Recommended stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion for light interaction polish
- React Hook Form
- Zod

## Backend

MVP option:

- Next.js API routes

Possible later evolution:

- Fastify
- NestJS
- dedicated API service

## Database

- PostgreSQL
- Prisma ORM

For the lean prototype, Supabase PostgreSQL is the recommended hosted option if external users will test the product.

For local experiments, Markdown files can be used before introducing hosted storage.

## AI Layer

Separate AI functions:

- interview question generator
- answer analyzer
- uncertainty scorer
- contradiction detector
- brief readiness evaluator
- brief generator
- document formatter

For the prototype, Anthropic is the primary provider.

Recommended model split:

- Sonnet for the main interview response and final brief generation
- Haiku for answer extraction, clarity updates, summary compaction, and readiness pre-checks

Keep an internal AI service interface so additional providers can be added later.

## Storage

MVP:

- text interview storage in PostgreSQL

Version 2:

- S3-compatible object storage for files, images, and references

## Auth

MVP:

- email and password
- Google login

## Service Layer

Keep domain logic in services:

- `authService`
- `sessionService`
- `messageService`
- `contextService`
- `projectService`
- `interviewService`
- `analysisService`
- `documentService`
- `ownerService`
