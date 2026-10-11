-- SMS aux gagnants : un envoi par personne et par événement (empêche les doublons).
create table winner_sms (
  event_id uuid not null references events on delete cascade,
  participant_id uuid not null references participants on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, participant_id)
);
alter table winner_sms enable row level security;
-- Lecture réservée à l'organisation ; l'écriture passe par l'Edge Function (clé de service).
create policy winner_sms_read on winner_sms for select using (is_staff(event_id, 'organizer'));
