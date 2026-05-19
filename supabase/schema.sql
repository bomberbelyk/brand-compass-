create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum (
      'email_pending',
      'code_pending',
      'active',
      'paused',
      'completed',
      'abandoned'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_role') then
    create type message_role as enum (
      'system',
      'assistant',
      'user'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'generated_document_type') then
    create type generated_document_type as enum (
      'client_brief',
      'raw_brief',
      'owner_follow_up'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'generated_document_status') then
    create type generated_document_status as enum (
      'draft',
      'ready',
      'sent'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'followup_status') then
    create type followup_status as enum (
      'draft',
      'sent',
      'discarded'
    );
  end if;
end $$;

create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  link_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owners_link_slug_idx on owners (link_slug);

create table if not exists client_sessions (
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

create index if not exists client_sessions_owner_id_idx on client_sessions (owner_id);
create index if not exists client_sessions_client_email_idx on client_sessions (client_email);
create index if not exists client_sessions_status_idx on client_sessions (status);
create index if not exists client_sessions_last_activity_idx on client_sessions (last_activity_at desc);
create index if not exists client_sessions_owner_status_idx on client_sessions (owner_id, status);

create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verification_codes_email_idx on verification_codes (email);
create index if not exists verification_codes_email_code_idx on verification_codes (email, code);

create table if not exists interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references client_sessions(id) on delete cascade,
  role message_role not null,
  content text not null,
  hidden boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists interview_messages_session_id_idx on interview_messages (session_id);
create index if not exists interview_messages_session_created_idx on interview_messages (session_id, created_at);

create table if not exists context_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references client_sessions(id) on delete cascade,
  context_markdown text not null,
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists context_snapshots_session_created_idx on context_snapshots (session_id, created_at desc);

create table if not exists generated_documents (
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

create index if not exists generated_documents_session_id_idx on generated_documents (session_id);
create index if not exists generated_documents_session_type_idx on generated_documents (session_id, type);

create table if not exists owner_followups (
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

create index if not exists owner_followups_owner_id_idx on owner_followups (owner_id);
create index if not exists owner_followups_session_id_idx on owner_followups (session_id);
create index if not exists owner_followups_status_idx on owner_followups (status);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists owners_set_updated_at on owners;
create trigger owners_set_updated_at
before update on owners
for each row execute function set_updated_at();

drop trigger if exists client_sessions_set_updated_at on client_sessions;
create trigger client_sessions_set_updated_at
before update on client_sessions
for each row execute function set_updated_at();

drop trigger if exists generated_documents_set_updated_at on generated_documents;
create trigger generated_documents_set_updated_at
before update on generated_documents
for each row execute function set_updated_at();

drop trigger if exists owner_followups_set_updated_at on owner_followups;
create trigger owner_followups_set_updated_at
before update on owner_followups
for each row execute function set_updated_at();

insert into owners (email, name, link_slug)
values ('owner@example.com', 'Request Architect Owner', 'default')
on conflict (email) do update
set
  name = excluded.name,
  link_slug = excluded.link_slug;

