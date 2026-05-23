create table if not exists public.expedition_status (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.expedition_status enable row level security;

create policy "Allow public read expedition status"
on public.expedition_status
for select
to anon
using (true);

create policy "Allow public insert expedition status"
on public.expedition_status
for insert
to anon
with check (true);

create policy "Allow public update expedition status"
on public.expedition_status
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.expedition_status;
