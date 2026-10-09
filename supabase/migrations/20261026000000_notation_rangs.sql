-- Notification « commentaire du jury » + envoi des rangs aux participants (organisateur).

create function notify_score_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare e entries%rowtype;
begin
  if new.comment is null or btrim(new.comment) = '' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.comment is not distinct from old.comment then
    return new;
  end if;
  select * into e from entries where id = new.entry_id;
  insert into notifications (participant_id, kind, payload)
  values (e.participant_id, 'com',
          jsonb_build_object('key', 'nCom', 'challengeId', e.challenge_id, 'entryId', e.id, 'comment', new.comment));
  return new;
end $$;

create trigger scores_notify_comment after insert or update of comment on scores
  for each row execute function notify_score_comment();

-- Une notification « rang » par participant, avec l'indication « provisoire » si le classement ne l'est pas encore.
create function notify_ranks(p_event uuid) returns int
language plpgsql security definer set search_path = public as $$
declare prov boolean; n int;
begin
  if not is_staff(p_event, 'organizer') then
    raise exception 'Réservé aux organisateurs' using errcode = '42501';
  end if;
  prov := exists (select 1 from entries where event_id = p_event and status = 'pending')
       or exists (select 1 from standings(p_event) where missing > 0);
  insert into notifications (participant_id, kind, payload)
  select r.participant_id, 'rang',
         jsonb_build_object('key', 'nRang', 'rank', r.rank, 'total', r.total, 'score', r.score, 'provisional', prov)
  from (
    select s.participant_id, s.score,
           row_number() over (order by s.score desc nulls last, s.top desc, s.done desc, s.last_validated asc nulls last) as rank,
           count(*) over () as total
    from standings(p_event) s
  ) r;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function notify_ranks(uuid) from public;
grant execute on function notify_ranks(uuid) to authenticated;
