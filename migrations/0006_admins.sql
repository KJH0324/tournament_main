create table if not exists admin_accounts (
  id text primary key,
  secret text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists admin_accounts_id_lower_idx on admin_accounts (lower(id));
