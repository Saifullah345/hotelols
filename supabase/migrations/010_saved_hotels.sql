create table if not exists saved_hotels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  hotel_id    uuid not null references hotels(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, hotel_id)
);

alter table saved_hotels enable row level security;

create policy "Users can view their own saved hotels"
  on saved_hotels for select
  using (auth.uid() = user_id);

create policy "Users can save hotels"
  on saved_hotels for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave hotels"
  on saved_hotels for delete
  using (auth.uid() = user_id);
