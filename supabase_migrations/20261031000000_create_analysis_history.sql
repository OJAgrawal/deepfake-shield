create table if not exists public.analysis_history (
    id uuid primary key default gen_random_uuid(),
    analysis_type text not null check (analysis_type in ('image', 'text')),
    label text not null,
    confidence double precision not null check (confidence >= 0 and confidence <= 1),
    explanation text not null,
    model_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists analysis_history_created_at_idx
    on public.analysis_history (created_at desc);

alter table public.analysis_history enable row level security;
