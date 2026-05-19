# API Routes

## Auth

```text
POST /api/auth/request-code
POST /api/auth/verify-code
GET /api/auth/session
```

For the lean prototype, email code verification is simulated.

## Owner

```text
GET /api/owner/sessions
GET /api/owner/sessions/:id
POST /api/owner/sessions/:id/send-brief
POST /api/owner/sessions/:id/send-follow-up
```

## Projects

```text
GET /api/projects
POST /api/projects
GET /api/projects/:id
PATCH /api/projects/:id
DELETE /api/projects/:id
```

## Interview

```text
POST /api/projects/:id/interview/start
GET /api/projects/:id/interview
POST /api/projects/:id/interview/message
POST /api/projects/:id/interview/analyze
POST /api/projects/:id/interview/complete
```

## Clarity Map

```text
GET /api/projects/:id/clarity
PATCH /api/projects/:id/clarity
```

## Contradictions

```text
GET /api/projects/:id/contradictions
POST /api/projects/:id/contradictions/analyze
```

## Documents

```text
GET /api/projects/:id/documents
POST /api/projects/:id/documents/generate
GET /api/documents/:id
PATCH /api/documents/:id
POST /api/documents/:id/export
```
