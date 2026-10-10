-- Correctif : `text[] || 'valeur'` interprétait la valeur comme un tableau (« malformed array literal »),
-- ce qui faisait échouer chaque envoi et chaque modération. On utilise array_append.
create or replace function refresh_badges(p_event uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record; n_ch int; got text[]; b text;
begin
  select count(*) into n_ch from challenges where event_id = p_event;
  for r in
    select s.participant_id, s.done,
           row_number() over (order by s.score desc nulls last, s.top desc, s.done desc, s.last_validated asc nulls last) as rank
    from standings_core(p_event) s
  loop
    got := array[]::text[];
    if exists (select 1 from entries where participant_id = r.participant_id) then got := array_append(got, 'first'); end if;
    if r.done >= 3 then got := array_append(got, 'trio'); end if;
    if n_ch > 0 and r.done >= n_ch then got := array_append(got, 'all'); end if;
    if exists (select 1 from entries where participant_id = r.participant_id and status = 'ok' and kind = 'video') then got := array_append(got, 'video'); end if;
    if exists (
      select 1 from entries e join scores s on s.entry_id = e.id
      where e.participant_id = r.participant_id and e.status = 'ok'
      group by e.id having avg((s.respect + s.quality + s.originality) / 3.0) >= 9
    ) then got := array_append(got, 'nine'); end if;
    if exists (select 1 from entries where participant_id = r.participant_id and status = 'ok' and favorite) then got := array_append(got, 'fav'); end if;
    if r.rank <= 3 and r.done > 0 then got := array_append(got, 'podium'); end if;

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
