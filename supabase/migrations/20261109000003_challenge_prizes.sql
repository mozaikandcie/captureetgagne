-- Prix par défi : meilleure note ; à égalité, le plus grand nombre de jurés ayant noté, puis l'envoi validé le plus tôt (CLAUDE.md, section 5).
-- Réservé à l'équipe : un juré ne lit que ses propres notes, il ne peut donc pas calculer ce classement lui-même.
create function challenge_prizes(p_event uuid)
returns table (challenge_id uuid, entry_id uuid, participant_id uuid, display_name text, kind text, storage_path text, note numeric)
language sql stable security definer set search_path = public as $$
  select distinct on (e.challenge_id)
    e.challenge_id, e.id, e.participant_id, p.display_name, e.kind, e.storage_path, n.note
  from entries e
  join participants p on p.id = e.participant_id
  join (
    select s.entry_id, avg((s.respect + s.quality + s.originality) / 3.0) as note, count(*) as n_jurors
    from scores s group by s.entry_id
  ) n on n.entry_id = e.id
  where e.event_id = p_event and e.status = 'ok' and is_staff(p_event)
  order by e.challenge_id, n.note desc, n.n_jurors desc, e.validated_at asc;
$$;
grant execute on function challenge_prizes(uuid) to authenticated;
