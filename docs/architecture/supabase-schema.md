# Supabase Schema

This schema supports the first lean prototype of Request Architect.

The prototype uses Supabase PostgreSQL as the working product database.

Runnable SQL file:

- `supabase/schema.sql`

## Goals

The schema must support:

- email-code session entry
- returning clients by email
- owner/admin view
- full raw transcript
- working context Markdown
- structured JSON state
- readiness status
- generated Client Briefs
- owner-reviewed follow-up drafts

## Extensions

Recommended:

```sql
create extension if not exists "pgcrypto";
```

This allows UUID generation with `gen_random_uuid()`.

## Enums

```sql
create type session_status as enum (
  'email_pending',
  'code_pending',
  'active',
  'paused',
  'completed',
  'abandoned'
);

create type message_role as enum (
  'system',
  'assistant',
  'user'
);

create type generated_document_type as enum (
  'client_brief',
  'raw_brief',
  'owner_follow_up'
);

create type generated_document_status as enum (
  'draft',
  'ready',
  'sent'
);

create type followup_status as enum (
  'draft',
  'sent',
  'discarded'
);
```

## owners

The freelancer, agency, or operator who owns interview links.

```sql
create table owners (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  link_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index owners_link_slug_idx on owners (link_slug);
```

Prototype note:

- seed one owner manually
- full owner auth is deferred

## client_sessions

One interview session with a client.

```sql
create table client_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  client_email text not null,
  client_name text,
  status session_status not null default 'email_pending',
  detected_language text not null default 'uk',
  document_language text not null default 'auto',
  current_stage text not null default 'email',
  inferred_project_type text,
  initial_request text,
  working_context_markdown text not null default '',
  state_json jsonb not null default '{}'::jsonb,
  readiness_level text not null default 'raw_request',
  readiness_score integer not null default 0 check (readiness_score >= 0 and readiness_score <= 100),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index client_sessions_owner_id_idx on client_sessions (owner_id);
create index client_sessions_client_email_idx on client_sessions (client_email);
create index client_sessions_status_idx on client_sessions (status);
create index client_sessions_last_activity_idx on client_sessions (last_activity_at desc);
create index client_sessions_owner_status_idx on client_sessions (owner_id, status);
```

Resume rule:

- find latest session by `client_email`
- prefer `active`, `paused`, or `abandoned`
- if all sessions are completed, create a new session but allow previous context to be referenced later

## verification_codes

Simulated email code storage.

```sql
create table verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index verification_codes_email_idx on verification_codes (email);
create index verification_codes_email_code_idx on verification_codes (email, code);
```

Prototype behavior:

- generate a 6-digit code
- expire after 10 minutes
- return code from API when `DEV_SHOW_EMAIL_CODE=true`
- later replace dev display with real email sending

## interview_messages

Full raw transcript.

```sql
create table interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references client_sessions(id) on delete cascade,
  role message_role not null,
  content text not null,
  hidden boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index interview_messages_session_id_idx on interview_messages (session_id);
create index interview_messages_session_created_idx on interview_messages (session_id, created_at);
```

## context_snapshots

Versioned context and state snapshots.

```sql
create table context_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references client_sessions(id) on delete cascade,
  context_markdown text not null,
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index context_snapshots_session_created_idx on context_snapshots (session_id, created_at desc);
```

Snapshot rule:

- create snapshot after each meaningful user answer
- create snapshot after final brief generation
- do not snapshot trivial system-only transitions unless useful for debugging

## generated_documents

Generated Markdown documents.

```sql
create table generated_documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references client_sessions(id) on delete cascade,
  type generated_document_type not null,
  language text not null,
  title text not null,
  content_markdown text not null,
  status generated_document_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index generated_documents_session_id_idx on generated_documents (session_id);
create index generated_documents_session_type_idx on generated_documents (session_id, type);
```

## owner_followups

Draft emails for incomplete sessions.

```sql
create table owner_followups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references client_sessions(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  client_email text not null,
  subject text not null,
  body_markdown text not null,
  status followup_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index owner_followups_owner_id_idx on owner_followups (owner_id);
create index owner_followups_session_id_idx on owner_followups (session_id);
create index owner_followups_status_idx on owner_followups (status);
```

## Updated At Trigger

Optional helper:

```sql
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger owners_set_updated_at
before update on owners
for each row execute function set_updated_at();

create trigger client_sessions_set_updated_at
before update on client_sessions
for each row execute function set_updated_at();

create trigger generated_documents_set_updated_at
before update on generated_documents
for each row execute function set_updated_at();

create trigger owner_followups_set_updated_at
before update on owner_followups
for each row execute function set_updated_at();
```

## Seed Owner

For prototype:

```sql
insert into owners (email, name, link_slug)
values ('owner@example.com', 'Request Architect Owner', 'default')
on conflict (email) do nothing;
```

## Minimal Row Level Security Approach

For the first server-side prototype:

- API routes use `SUPABASE_SERVICE_ROLE_KEY`
- do not expose direct table access to the browser
- keep RLS policies strict or disabled only in local development

Later:

- add owner auth
- add client session tokens
- add RLS policies per owner/session

## Data Ownership

Each session belongs to exactly one owner.

The owner link determines `owner_id`.

The client email determines session resume.

## Human-In-The-Loop Rule

If a session is incomplete:

- store raw transcript
- store context
- store state
- generate owner follow-up draft
- do not email the client automatically

The owner decides whether to send, edit, or discard the follow-up.
