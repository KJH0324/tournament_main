create table if not exists desk_settings (
  id int primary key,
  tour_name text not null,
  season_label text not null,
  venue_note text not null,
  constraint desk_settings_one check (id = 1)
);

create table if not exists matches (
  id serial primary key,
  team1 text not null,
  team2 text not null,
  round_label text not null default '',
  group_label text not null default '',
  starts_at timestamptz,
  room_name text not null default '',
  judge_name text not null default '',
  recorder_name text not null default '',
  status text not null default 'open' check (status in ('open', 'live', 'done')),
  remarks text not null default '',
  score_text text not null default '',
  winner text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists matches_starts_at_idx on matches (starts_at);

create table if not exists tickets (
  id serial primary key,
  category text not null check (category in ('bug', 'report', 'emergency')),
  handle text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

insert into desk_settings (id, tour_name, season_label, venue_note)
values (1, 'Raven Tournament', '시즌 01', '일정은 한국 시간')
on conflict (id) do nothing;
