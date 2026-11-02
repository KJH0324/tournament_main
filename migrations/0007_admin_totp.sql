create table if not exists admin_totp (
  id text primary key,
  secret text not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
