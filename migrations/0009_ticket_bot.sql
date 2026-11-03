do $$
declare name text;
begin
  for name in
    select conname
    from pg_constraint
    where conrelid = 'tickets'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table tickets drop constraint %I', name);
  end loop;
end $$;

alter table tickets
  add constraint tickets_category_check
  check (category in ('bug', 'report', 'emergency', 'bot'));
