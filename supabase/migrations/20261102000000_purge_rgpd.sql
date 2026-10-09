-- Purge RGPD (voir CLAUDE.md, section 6) : les coordonnées partent 3 mois après l'événement,
-- les contenus 2 ans après. Pour supprimer le compte Auth (qui porte le téléphone) sans perdre
-- le classement, le lien participant → compte devient facultatif.

alter table participants alter column user_id drop not null;
alter table participants drop constraint participants_user_id_fkey;
alter table participants
  add constraint participants_user_id_fkey foreign key (user_id) references auth.users on delete set null;

-- La RLS repose sur `user_id = auth.uid()` : un participant purgé n'a plus d'accès, ce qui est voulu.
