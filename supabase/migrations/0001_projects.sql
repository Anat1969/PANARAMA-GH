-- Panarama projects: stores a saved pair of images + the interpretation/prompt.
-- Apply via the Supabase MCP apply_migration tool, the SQL editor, or the CLI.

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  title           text,
  interpretation  text,
  prompt          text,
  original_path   text,
  generated_path  text
);

alter table public.projects enable row level security;

-- Demo policies: allow the anon (publishable) key to insert and read projects.
-- Tighten these (e.g. require auth) before any real multi-user use.
drop policy if exists "anon insert projects" on public.projects;
create policy "anon insert projects"
  on public.projects for insert
  to anon
  with check (true);

drop policy if exists "anon select projects" on public.projects;
create policy "anon select projects"
  on public.projects for select
  to anon
  using (true);

-- Storage bucket for the original + Midjourney images (public read for easy display).
insert into storage.buckets (id, name, public)
values ('panarama-projects', 'panarama-projects', true)
on conflict (id) do nothing;

-- Allow anon uploads + reads to this bucket only.
drop policy if exists "anon upload panarama" on storage.objects;
create policy "anon upload panarama"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'panarama-projects');

drop policy if exists "anon read panarama" on storage.objects;
create policy "anon read panarama"
  on storage.objects for select
  to anon
  using (bucket_id = 'panarama-projects');
