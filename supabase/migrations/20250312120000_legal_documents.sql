create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('privacy', 'terms')),
  locale text not null default 'en',
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists legal_documents_type_locale_uniq
  on public.legal_documents(type, locale);
