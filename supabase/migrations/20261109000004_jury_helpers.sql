-- Aides pour l'espace jury : un juré ne lit que ses propres notes, ces fonctions donnent les agrégats à l'équipe.

-- Note moyenne et nombre de jurés ayant noté, par envoi validé.
create function entry_stats(p_event uuid) returns table (entry_id uuid, avg_note numeric, n_jurors int)
language sql stable security definer set search_path = public as $$
  select s.entry_id, avg((s.respect + s.quality + s.originality) / 3.0), count(*)::int
  from scores s join entries e on e.id = s.entry_id
  where e.event_id = p_event and e.status = 'ok' and is_staff(p_event)
  group by s.entry_id;
$$;

create function juror_count(p_event uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from staff where event_id = p_event and role = 'juror' and is_staff(p_event);
$$;
grant execute on function entry_stats(uuid), juror_count(uuid) to authenticated;

-- Un contenu qui n'est plus « validé » perd ses notes et son coup de cœur (comportement du prototype).
create function entries_reset_when_unvalidated() returns trigger language plpgsql as $$
begin
  if old.status = 'ok' and new.status <> 'ok' then
    new.favorite := false;
  end if;
  return new;
end $$;
create trigger entries_reset_favorite before update of status on entries
  for each row execute function entries_reset_when_unvalidated();

create function entries_delete_scores_when_unvalidated() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'ok' and new.status <> 'ok' then
    delete from scores where entry_id = new.id;
  end if;
  return null;
end $$;
create trigger entries_delete_scores after update of status on entries
  for each row execute function entries_delete_scores_when_unvalidated();
