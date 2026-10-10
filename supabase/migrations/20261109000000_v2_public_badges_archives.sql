-- V2 : Prix du public (votes), badges, archives des événements, affiches et photos d'exemple.

-- ---------- Classement : cœur sans garde d'accès, réutilisé par les badges et les résumés ----------

create function standings_core(p_event uuid)
returns table (participant_id uuid, display_name text, done int, jury numeric,
               top numeric, last_validated timestamptz, missing int, score numeric)
language sql stable security definer set search_path = public as $$
  with jurors as (
    select count(*)::int as n from staff where event_id = p_event and role = 'juror'
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

create or replace function standings(p_event uuid)
returns table (participant_id uuid, display_name text, done int, jury numeric,
               top numeric, last_validated timestamptz, missing int, score numeric)
language sql stable security definer set search_path = public as $$
  select * from standings_core(p_event) s
  where is_staff(p_event) or is_participant(p_event)
  order by s.score desc nulls last, s.top desc, s.done desc, s.last_validated asc nulls last;
$$;

-- ---------- Prix du public ----------

alter table events add column public_vote boolean not null default false;

create table votes (
  participant_id uuid not null references participants on delete cascade,
  entry_id uuid not null references entries on delete cascade,
  created_at timestamptz not null default now(),
  primary key (participant_id, entry_id)
);
create index on votes (entry_id);

-- 3 votes par participant, jamais pour soi, seulement sur un envoi validé du même événement, si le Prix du public est ouvert.
create function votes_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare e entries%rowtype; v participants%rowtype; open boolean; n int;
begin
  select * into e from entries where id = new.entry_id;
  select * into v from participants where id = new.participant_id;
  select public_vote into open from events where id = e.event_id;
  if e.id is null or v.id is null or e.event_id <> v.event_id then
    raise exception 'Vote impossible' using errcode = 'P0001';
  end if;
  if not coalesce(open, false) then raise exception 'Le Prix du public est fermé' using errcode = 'P0001'; end if;
  if e.participant_id = new.participant_id then raise exception 'Pas de vote pour soi-même' using errcode = 'P0001'; end if;
  if e.status <> 'ok' then raise exception 'Seuls les contenus validés se votent' using errcode = 'P0001'; end if;
  select count(*) into n from votes where participant_id = new.participant_id;
  if n >= 3 then raise exception '3 votes maximum' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger votes_before_insert before insert on votes for each row execute function votes_before_insert();

alter table votes enable row level security;
create policy votes_read on votes for select
  using (owns_participant(participant_id)
         or exists (select 1 from entries e where e.id = entry_id and is_staff(e.event_id)));
create policy votes_insert on votes for insert with check (owns_participant(participant_id));
create policy votes_delete on votes for delete using (owns_participant(participant_id));

-- Nombre de votes par envoi (visible des participants et du jury : les votes eux-mêmes restent privés).
create function vote_counts(p_event uuid) returns table (entry_id uuid, votes int)
language sql stable security definer set search_path = public as $$
  select v.entry_id, count(*)::int
  from votes v join entries e on e.id = v.entry_id
  where e.event_id = p_event and (is_staff(p_event) or is_participant(p_event))
  group by v.entry_id;
$$;

-- Gagnant du Prix du public : le plus de votes ; à égalité, le contenu validé en premier (règle à confirmer par le bureau).
create function public_prize(p_event uuid) returns table (entry_id uuid, participant_id uuid, display_name text, votes int)
language sql stable security definer set search_path = public as $$
  select e.id, e.participant_id, p.display_name, count(*)::int
  from votes v join entries e on e.id = v.entry_id join participants p on p.id = e.participant_id
  where e.event_id = p_event and e.status = 'ok' and (is_staff(p_event) or is_participant(p_event))
  group by e.id, e.participant_id, p.display_name, e.validated_at
  order by count(*) desc, e.validated_at asc
  limit 3;
$$;

-- ---------- Badges ----------

create table participant_badges (
  participant_id uuid not null references participants on delete cascade,
  badge text not null check (badge in ('first','trio','all','video','nine','fav','podium')),
  awarded_at timestamptz not null default now(),
  primary key (participant_id, badge)
);
alter table participant_badges enable row level security;
create policy badges_read on participant_badges for select
  using (owns_participant(participant_id)
         or exists (select 1 from participants p where p.id = participant_id and is_staff(p.event_id)));

create function refresh_badges(p_event uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record; n_ch int; got text[]; b text;
begin
  select count(*) into n_ch from challenges where event_id = p_event;
  for r in
    select s.participant_id, s.done,
           row_number() over (order by s.score desc nulls last, s.top desc, s.done desc, s.last_validated asc nulls last) as rank
    from standings_core(p_event) s
  loop
    got := '{}';
    if exists (select 1 from entries where participant_id = r.participant_id) then got := got || 'first'; end if;
    if r.done >= 3 then got := got || 'trio'; end if;
    if n_ch > 0 and r.done >= n_ch then got := got || 'all'; end if;
    if exists (select 1 from entries where participant_id = r.participant_id and status = 'ok' and kind = 'video') then got := got || 'video'; end if;
    if exists (
      select 1 from entries e join scores s on s.entry_id = e.id
      where e.participant_id = r.participant_id and e.status = 'ok'
      group by e.id having avg((s.respect + s.quality + s.originality) / 3.0) >= 9
    ) then got := got || 'nine'; end if;
    if exists (select 1 from entries where participant_id = r.participant_id and status = 'ok' and favorite) then got := got || 'fav'; end if;
    if r.rank <= 3 and r.done > 0 then got := got || 'podium'; end if;

    foreach b in array got loop
      insert into participant_badges (participant_id, badge) values (r.participant_id, b) on conflict do nothing;
      if found then
        insert into notifications (participant_id, kind, payload)
        values (r.participant_id, 'badge', jsonb_build_object('key', 'nBadge', 'badge', b));
      end if;
    end loop;
  end loop;
end $$;
revoke all on function refresh_badges(uuid) from public, anon, authenticated;

create function badges_after_entry() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform refresh_badges(new.event_id);
  return null;
end $$;
create trigger entries_badges_insert after insert on entries for each row execute function badges_after_entry();
create trigger entries_badges_update after update of status, favorite on entries for each row execute function badges_after_entry();

create function badges_after_score() returns trigger language plpgsql security definer set search_path = public as $$
declare ev uuid;
begin
  select event_id into ev from entries where id = new.entry_id;
  perform refresh_badges(ev);
  return null;
end $$;
create trigger scores_badges after insert or update on scores for each row execute function badges_after_score();

-- ---------- Archives et événement suivant ----------

create function event_summary(p_event uuid)
returns table (name text, date_label text, participants int, contents int,
               winner text, winner_score numeric, public_winner text, favorite_paths text[])
language sql stable security definer set search_path = public as $$
  select ev.name, ev.date_label,
    (select count(*) from participants where event_id = p_event)::int,
    (select count(*) from entries where event_id = p_event and status = 'ok')::int,
    (select s.display_name from standings_core(p_event) s where s.done > 0 limit 1),
    (select s.score from standings_core(p_event) s where s.done > 0 limit 1),
    (select pp.display_name from public_prize(p_event) pp limit 1),
    coalesce((select array_agg(e.storage_path) from (
        select storage_path from entries where event_id = p_event and status = 'ok' and favorite limit 6) e), '{}')
  from events ev
  where ev.id = p_event and is_staff(p_event);
$$;

create function archive_event(p_event uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(p_event, 'organizer') then raise exception 'Réservé aux organisateurs' using errcode = '42501'; end if;
  update events set status = 'archived' where id = p_event;
end $$;

-- Nouvel événement en brouillon, avec les mêmes défis, le même règlement et la même équipe.
create function create_next_event(p_from uuid, p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not is_staff(p_from, 'organizer') then raise exception 'Réservé aux organisateurs' using errcode = '42501'; end if;
  insert into events (name, place, rules, status)
    select coalesce(nullif(p_name, ''), 'Nouvel événement'), place, rules, 'draft' from events where id = p_from
    returning id into new_id;
  insert into challenges (event_id, position, title, hint, tip, culture, example_path, kind)
    select new_id, position, title, hint, tip, culture, example_path, kind from challenges where event_id = p_from;
  insert into staff (event_id, user_id, role, label)
    select new_id, user_id, role, label from staff where event_id = p_from;
  return new_id;
end $$;

grant execute on function vote_counts(uuid), public_prize(uuid), event_summary(uuid), archive_event(uuid), create_next_event(uuid, text) to authenticated;

-- ---------- Affiches et photos d'exemple : bucket public, écriture réservée à l'organisation ----------

insert into storage.buckets (id, name, public, file_size_limit)
values ('posters', 'posters', true, 5242880)
on conflict (id) do nothing;

create policy posters_write on storage.objects for insert to authenticated
  with check (bucket_id = 'posters' and is_staff(((storage.foldername(name))[1])::uuid, 'organizer'));
create policy posters_update on storage.objects for update to authenticated
  using (bucket_id = 'posters' and is_staff(((storage.foldername(name))[1])::uuid, 'organizer'));
create policy posters_delete on storage.objects for delete to authenticated
  using (bucket_id = 'posters' and is_staff(((storage.foldername(name))[1])::uuid, 'organizer'));

-- Temps réel : votes et badges.
alter publication supabase_realtime add table votes, participant_badges;
