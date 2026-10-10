-- Nombre de jurés choisi et validé par l'organisation, invitations de jurés, photo (facultative) du participant.

alter table events
  add column jurors_expected smallint check (jurors_expected between 1 and 20),
  add column jurors_validated boolean not null default false;

alter table participants add column avatar_path text;   -- bucket `media`, dossier du participant ; sans photo : initiales

-- Invitations : l'organisation saisit le téléphone d'un juré ; le rattachement se fait à sa première connexion.
create table staff_invites (
  event_id uuid not null references events on delete cascade,
  phone text not null,                       -- chiffres seuls, comme dans auth.users (ex. 33612345678)
  role text not null default 'juror' check (role in ('juror','organizer')),
  label text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, phone)
);
alter table staff_invites enable row level security;
create policy staff_invites_all on staff_invites for all
  using (is_staff(event_id, 'organizer')) with check (is_staff(event_id, 'organizer'));

create function claim_staff_invites() returns int language plpgsql security definer set search_path = public as $$
declare my_phone text; n int;
begin
  select phone into my_phone from auth.users where id = auth.uid();
  if my_phone is null then return 0; end if;
  insert into staff (event_id, user_id, role, label)
    select event_id, auth.uid(), role, label from staff_invites where phone = my_phone
    on conflict (event_id, user_id) do nothing;
  get diagnostics n = row_count;
  delete from staff_invites where phone = my_phone;
  return n;
end $$;
grant execute on function claim_staff_invites() to authenticated;

-- Nombre de jurés attendu : celui validé par l'organisation, à défaut le nombre de jurés inscrits.
create or replace function juror_count(p_event uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select jurors_expected from events where id = p_event), 0),
                  (select count(*)::int from staff where event_id = p_event and role = 'juror'))
  where is_staff(p_event);
$$;

create or replace function standings_core(p_event uuid)
returns table (participant_id uuid, display_name text, done int, jury numeric,
               top numeric, last_validated timestamptz, missing int, score numeric)
language sql stable security definer set search_path = public as $$
  with jurors as (
    select coalesce(nullif((select jurors_expected from events where id = p_event), 0), count(*)::int) as n
    from staff where event_id = p_event and role = 'juror'
  ),
  note as (
    select s.entry_id, avg((s.respect + s.quality + s.originality) / 3.0) as note, count(*) as n_jurors
    from scores s join entries e on e.id = s.entry_id
    where e.event_id = p_event group by s.entry_id
  ),
  ok as (
    select e.*, n.note, coalesce(n.n_jurors, 0) as n_jurors
    from entries e left join note n on n.entry_id = e.id
    where e.event_id = p_event and e.status = 'ok'
  ),
  best as (
    select participant_id, challenge_id, max(note) as best
    from ok group by participant_id, challenge_id
  ),
  agg as (
    select p.id as participant_id, p.display_name,
      (select count(distinct challenge_id) from ok where ok.participant_id = p.id)::int as done,
      coalesce((select avg(best) from best where best.participant_id = p.id and best.best is not null), 0) as jury,
      coalesce((select max(best) from best where best.participant_id = p.id), 0) as top,
      (select max(validated_at) from ok where ok.participant_id = p.id) as last_validated,
      (select count(*) from ok, jurors where ok.participant_id = p.id and ok.n_jurors < jurors.n)::int as missing
    from participants p where p.event_id = p_event
  )
  select a.participant_id, a.display_name, a.done, round(a.jury, 4), round(a.top, 4),
    a.last_validated, a.missing,
    round(30.0 * a.done / nullif((select count(*) from challenges where event_id = p_event), 0)
          + 70.0 * a.jury / 10.0, 2)
  from agg a
  order by 8 desc nulls last, a.top desc, a.done desc, a.last_validated asc nulls last;
$$;
revoke all on function standings_core(uuid) from public, anon, authenticated;
