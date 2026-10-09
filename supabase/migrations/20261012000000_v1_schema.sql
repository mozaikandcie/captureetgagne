-- Capture et Gagne · schéma V1
-- Périmètre V1 uniquement : pas de votes, pas de badges (voir CLAUDE.md, section 11).

-- ---------- Tables ----------

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_label text,
  place text,
  message text,
  prizes text,
  poster_path text,
  ends_at timestamptz,                   -- fin des envois (compte à rebours)
  rules text not null,
  status text not null default 'draft'
    check (status in ('draft','live','closed','archived')),
  created_at timestamptz not null default now()
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  position int not null,
  title jsonb not null,                  -- {"fr": "..."} ; traductions en V2
  hint jsonb not null,
  tip jsonb,
  culture jsonb,
  example_path text,
  kind text not null check (kind in ('photo','video','both'))
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null,
  lang text not null default 'fr',
  consent_rules_at timestamptz not null,
  consent_image_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table staff (
  event_id uuid references events on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('juror','organizer')),
  label text not null,
  primary key (event_id, user_id)
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  challenge_id uuid not null references challenges on delete cascade,
  participant_id uuid not null references participants on delete cascade,
  kind text not null check (kind in ('photo','video')),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','ok','rejected')),
  validated_at timestamptz,              -- départage : dernier envoi validé
  reject_reason text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index on entries (event_id, status);
create index on entries (participant_id);

create table scores (
  entry_id uuid references entries on delete cascade,
  juror_id uuid references auth.users on delete cascade,
  respect smallint not null check (respect between 0 and 10),
  quality smallint not null check (quality between 0 and 10),
  originality smallint not null check (originality between 0 and 10),
  comment text,
  updated_at timestamptz not null default now(),
  primary key (entry_id, juror_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants on delete cascade,
  kind text not null check (kind in ('defi','refus','com','rang')),
  payload jsonb not null,                -- clés i18n + variables
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (participant_id, created_at desc);

-- ---------- Fonctions d'aide (security definer : évitent la récursion RLS) ----------

create function is_staff(p_event uuid, p_role text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff
    where event_id = p_event and user_id = auth.uid()
      and (p_role is null or role = p_role)
  );
$$;

create function is_participant(p_event uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from participants where event_id = p_event and user_id = auth.uid());
$$;

create function owns_participant(p_participant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from participants where id = p_participant and user_id = auth.uid());
$$;

-- ---------- Triggers : règles du concours ----------

create function entries_before_insert() returns trigger language plpgsql as $$
declare ends timestamptz; n int;
begin
  select ends_at into ends from events where id = new.event_id;
  if ends is not null and now() > ends then
    raise exception 'Les envois sont fermés' using errcode = 'P0001';
  end if;
  select count(*) into n from entries
    where participant_id = new.participant_id and challenge_id = new.challenge_id
      and status <> 'rejected';
  if n >= 2 then
    raise exception '2 envois maximum par défi' using errcode = 'P0001';
  end if;
  new.status := 'pending';
  return new;
end $$;
create trigger entries_before_insert before insert on entries
  for each row execute function entries_before_insert();

create function entries_before_update() returns trigger language plpgsql as $$
declare n int;
begin
  if new.status = 'ok' and old.status <> 'ok' then
    new.validated_at := now();
  end if;
  if new.favorite and not old.favorite then
    select count(*) into n from entries
      where event_id = new.event_id and kind = new.kind and favorite;
    if n >= 3 then
      raise exception '3 coups de cœur maximum par type de média' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger entries_before_update before update on entries
  for each row execute function entries_before_update();

-- ---------- Classement (miroir de apps/web/src/lib/score.ts) ----------

create function standings(p_event uuid)
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
  where is_staff(p_event) or is_participant(p_event)
  order by 8 desc nulls last, a.top desc, a.done desc, a.last_validated asc nulls last;
$$;

-- ---------- RLS ----------

alter table events        enable row level security;
alter table challenges    enable row level security;
alter table participants  enable row level security;
alter table staff         enable row level security;
alter table entries       enable row level security;
alter table scores        enable row level security;
alter table notifications enable row level security;

-- events, challenges
create policy events_read on events for select
  using (status in ('live','closed') or is_staff(id));
create policy events_write on events for all
  using (is_staff(id, 'organizer')) with check (is_staff(id, 'organizer'));

create policy challenges_read on challenges for select
  using (is_staff(event_id) or exists (
    select 1 from events e where e.id = event_id and e.status in ('live','closed')));
create policy challenges_write on challenges for all
  using (is_staff(event_id, 'organizer')) with check (is_staff(event_id, 'organizer'));

-- staff : chacun voit sa ligne, l'organisateur voit et gère tout
create policy staff_read on staff for select
  using (user_id = auth.uid() or is_staff(event_id, 'organizer'));
create policy staff_write on staff for all
  using (is_staff(event_id, 'organizer')) with check (is_staff(event_id, 'organizer'));

-- participants : sa ligne ; le jury et l'organisation lisent tout
create policy participants_read on participants for select
  using (user_id = auth.uid() or is_staff(event_id));
create policy participants_insert on participants for insert
  with check (user_id = auth.uid()
    and exists (select 1 from events e where e.id = event_id and e.status = 'live'));
create policy participants_update on participants for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- entries
create policy entries_read on entries for select
  using (owns_participant(participant_id) or is_staff(event_id)
         or (status = 'ok' and is_participant(event_id)));
create policy entries_insert on entries for insert
  with check (owns_participant(participant_id));
create policy entries_delete_own on entries for delete
  using (owns_participant(participant_id) or is_staff(event_id, 'organizer'));
create policy entries_staff_update on entries for update
  using (is_staff(event_id)) with check (is_staff(event_id));

-- scores
create policy scores_read on scores for select
  using (
    juror_id = auth.uid()
    or exists (select 1 from entries e where e.id = entry_id and is_staff(e.event_id, 'organizer'))
    or exists (select 1 from entries e where e.id = entry_id and e.status = 'ok'
               and owns_participant(e.participant_id)));
create policy scores_write on scores for all
  using (juror_id = auth.uid() and exists (
    select 1 from entries e where e.id = entry_id and is_staff(e.event_id, 'juror')))
  with check (juror_id = auth.uid() and exists (
    select 1 from entries e where e.id = entry_id and is_staff(e.event_id, 'juror')));

-- notifications : le participant lit et marque comme lues ; les insertions passent par des fonctions
create policy notifications_read on notifications for select
  using (owns_participant(participant_id));
create policy notifications_update on notifications for update
  using (owns_participant(participant_id)) with check (owns_participant(participant_id));

-- ---------- Realtime ----------
alter publication supabase_realtime add table entries, notifications;

-- ---------- Storage : bucket privé `media`, chemin event_id/participant_id/entry_id.ext ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)        -- 50 Mo (plan Free) ; avec le plan Pro : 209715200 (200 Mo)
on conflict (id) do nothing;

create policy media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
    and owns_participant(((storage.foldername(name))[2])::uuid));
create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (
    owns_participant(((storage.foldername(name))[2])::uuid)
    or is_staff(((storage.foldername(name))[1])::uuid)
    or (is_participant(((storage.foldername(name))[1])::uuid) and exists (
          select 1 from entries e where e.storage_path = name and e.status = 'ok'))));
create policy media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owns_participant(((storage.foldername(name))[2])::uuid));
