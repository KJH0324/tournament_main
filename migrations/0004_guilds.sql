create table if not exists guilds (
  guild_id text primary key,
  slug text not null unique,
  name text not null default '',
  created_at timestamptz not null default now()
);

insert into guilds (guild_id, slug, name)
values ('1194868040895049728', 'raven', 'Raven Tournament')
on conflict (guild_id) do nothing;

create table if not exists guild_config (
  guild_id text primary key references guilds (guild_id),
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
  challonge_tournament text not null default ''
);

insert into guild_config (
  guild_id, admin_role, organizer_role, supervisor_role, operator_role, commander_role,
  strict_authorization, max_active_matches, max_roster_members_per_team, max_roster_upload_rows,
  match_channel_batch_limit, appeal_channel, participants_channel, schedule_channel,
  results_channel, notification_channel, transcript_channel, thumbnail_channel, tour_logo, challonge_tournament
)
select
  '1194868040895049728',
  admin_role, organizer_role, supervisor_role, operator_role, commander_role,
  strict_authorization, max_active_matches, max_roster_members_per_team, max_roster_upload_rows,
  match_channel_batch_limit, appeal_channel, participants_channel, schedule_channel,
  results_channel, notification_channel, transcript_channel, thumbnail_channel, tour_logo, challonge_tournament
from bot_config
where id = 1
on conflict (guild_id) do nothing;

alter table matches add column if not exists guild_id text not null default '1194868040895049728';
alter table tickets add column if not exists guild_id text not null default '1194868040895049728';
alter table rosters add column if not exists guild_id text not null default '1194868040895049728';
alter table bans add column if not exists guild_id text not null default '1194868040895049728';
alter table appeals add column if not exists guild_id text not null default '1194868040895049728';
alter table audit_log add column if not exists guild_id text not null default '1194868040895049728';
alter table snapshots add column if not exists guild_id text not null default '1194868040895049728';
alter table roster_history add column if not exists guild_id text not null default '1194868040895049728';

alter table rosters drop constraint if exists rosters_team_name_game_id_key;
create unique index if not exists rosters_guild_team_game_idx on rosters (guild_id, team_name, game_id);

alter table bans drop constraint if exists bans_pkey;
alter table bans add primary key (guild_id, game_id);

create index if not exists matches_guild_idx on matches (guild_id, starts_at);
create index if not exists tickets_guild_idx on tickets (guild_id, created_at desc);
create index if not exists audit_guild_idx on audit_log (guild_id, id desc);
