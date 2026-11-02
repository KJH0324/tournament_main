alter table guild_config add column if not exists alert_email_1 text not null default '';
alter table guild_config add column if not exists alert_email_2 text not null default '';
alter table guild_config add column if not exists alert_email_3 text not null default '';

delete from guild_config
where guild_id = '1194868040895049728'
  and coalesce(admin_role, '') = ''
  and coalesce(organizer_role, '') = ''
  and coalesce(supervisor_role, '') = ''
  and coalesce(operator_role, '') = ''
  and coalesce(commander_role, '') = ''
  and not exists (select 1 from matches where guild_id = '1194868040895049728')
  and not exists (select 1 from tickets where guild_id = '1194868040895049728')
  and not exists (select 1 from rosters where guild_id = '1194868040895049728');

delete from guilds
where guild_id = '1194868040895049728'
  and slug = 'raven'
  and name = 'Raven Tournament'
  and not exists (select 1 from guild_config where guild_id = '1194868040895049728');
