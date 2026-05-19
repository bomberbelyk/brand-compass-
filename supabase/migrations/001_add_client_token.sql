-- Add client_token to generated_documents for public brief sharing
alter table generated_documents
  add column if not exists client_token uuid unique default gen_random_uuid();

-- Index for fast token lookup on /brief/[token] page
create index if not exists generated_documents_client_token_idx
  on generated_documents (client_token);

-- Also track whether client confirmed the brief
alter table generated_documents
  add column if not exists client_confirmed_at timestamptz;
