-- Droit à l'effacement (RGPD) : un participant peut supprimer son inscription (ses envois partent avec, en cascade),
-- et l'organisation peut supprimer un participant. Sert aussi aux tests de bout en bout.
create policy participants_delete on participants for delete
  using (user_id = auth.uid() or is_staff(event_id, 'organizer'));
