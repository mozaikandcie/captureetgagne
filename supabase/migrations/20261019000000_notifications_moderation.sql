-- Notifications « défi réussi » et « refus » : créées par trigger quand le jury change le statut d'un envoi.
-- Le payload contient une clé de traduction et des variables, jamais de texte figé (voir CLAUDE.md, section 3).

create function notify_entry_moderated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'ok' then
    insert into notifications (participant_id, kind, payload)
    values (new.participant_id, 'defi',
            jsonb_build_object('key', 'nDefi', 'challengeId', new.challenge_id, 'entryId', new.id));
  elsif new.status = 'rejected' then
    insert into notifications (participant_id, kind, payload)
    values (new.participant_id, 'refus',
            jsonb_build_object('key', 'nRefus', 'challengeId', new.challenge_id, 'entryId', new.id,
                               'reason', new.reject_reason));
  end if;
  return new;
end $$;

create trigger entries_notify_moderated after update of status on entries
  for each row execute function notify_entry_moderated();
