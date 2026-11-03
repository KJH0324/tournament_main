alter table tickets add column if not exists discord_id text not null default '';
alter table tickets add column if not exists email text not null default '';
alter table tickets add column if not exists reply text not null default '';
alter table tickets add column if not exists replied_at timestamptz;
