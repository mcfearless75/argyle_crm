create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Authenticated users can register push subscription"
  on push_subscriptions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can upsert push subscription"
  on push_subscriptions for update
  to authenticated
  using (true);
