delete from matches
where (team1, team2) in (
  ('흑월', '적호'),
  ('은깃', '밤까마귀'),
  ('백로', '잿불'),
  ('창연', '북풍')
);

alter table matches add column if not exists state text not null default 'scheduled';
alter table matches add column if not exists challonge_match text not null default '';
alter table matches add column if not exists commander1 text not null default '';
alter table matches add column if not exists commander2 text not null default '';
alter table matches add column if not exists team1_ready boolean not null default false;
alter table matches add column if not exists team2_ready boolean not null default false;
alter table matches add column if not exists disqualified text not null default '';
alter table matches add column if not exists channel_id text not null default '';
alter table matches add column if not exists image_url text not null default '';

create table if not exists bot_config (
  id int primary key,
  admin_role text not null default '',
  organizer_role text not null default '',
  supervisor_role text not null default '',
  operator_role text not null default '',
  commander_role text not null default '',
  strict_authorization boolean not null default false,
  max_active_matches int not null default 128,
  max_roster_members_per_team int not null default 6,
  max_roster_upload_rows int not null default 2500,
  match_channel_batch_limit int not null default 40,
  appeal_channel text not null default '',
  participants_channel text not null default '',
  schedule_channel text not null default '',
  results_channel text not null default '',
  notification_channel text not null default '',
  transcript_channel text not null default '',
  thumbnail_channel text not null default '',
  tour_logo text not null default '',
  challonge_tournament text not null default '',
  constraint bot_config_one check (id = 1)
);

insert into bot_config (id) values (1) on conflict (id) do nothing;

create table if not exists rosters (
  id serial primary key,
  team_name text not null,
  game_id text not null,
  role text not null default 'member',
  discord_id text not null default '',
  unique (team_name, game_id)
);

create table if not exists bans (
  game_id text primary key,
  reason text not null,
  banned_by text not null default '',
  banned_at timestamptz not null default now()
);

create table if not exists appeals (
  id text primary key,
  match_ref text not null default '',
  team_name text not null default '',
  reason text not null,
  evidence text not null default '',
  status text not null default 'open',
  reviewer_id text not null default '',
  decision text not null default '',
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id serial primary key,
  action text not null,
  actor_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists snapshots (
  id text primary key,
  label text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists roster_history (
  id serial primary key,
  action text not null,
  detail text not null default '',
  actor_id text not null default '',
  created_at timestamptz not null default now()
);
